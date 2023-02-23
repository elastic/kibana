/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync, mkdirSync } from 'fs';
import Path, { dirname } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';

import { Suite, Test } from './fake_mocha_types';
import {
  Lifecycle,
  ProviderCollection,
  Providers,
  readProviderSpec,
  setupMocha,
  runTests,
  DockerServersService,
  Config,
  SuiteTracker,
  EsVersion,
  DedicatedTaskRunner,
} from './lib';
import { createEsClientForFtrConfig } from '../es';

export class FunctionalTestRunner {
  private readonly esVersion: EsVersion;
  constructor(
    private readonly log: ToolingLog,
    private readonly config: Config,
    esVersion?: string | EsVersion
  ) {
    this.esVersion =
      esVersion === undefined
        ? EsVersion.getDefault()
        : esVersion instanceof EsVersion
        ? esVersion
        : new EsVersion(esVersion);
  }

  async run(abortSignal?: AbortSignal) {
    const testStats = await this.getTestStats();

    return await this.runHarness(async (lifecycle, coreProviders) => {
      SuiteTracker.startTracking(lifecycle, this.config.path);

      const realServices =
        !testStats || (testStats.testCount > 0 && testStats.nonSkippedTestCount > 0);

      const providers = realServices
        ? new ProviderCollection(this.log, [
            ...coreProviders,
            ...readProviderSpec('Service', this.config.get('services')),
            ...readProviderSpec('PageObject', this.config.get('pageObjects')),
          ])
        : this.getStubProviderCollection(coreProviders);

      if (realServices) {
        if (providers.hasService('es')) {
          await this.validateEsVersion();
        }
        await providers.loadAll();
      }

      const customTestRunner = this.config.get('testRunner');
      if (customTestRunner) {
        this.log.warning(
          'custom test runner defined, ignoring all mocha/suite/filtering related options'
        );
        return (await providers.invokeProviderFn(customTestRunner)) || 0;
      }

      let reporter;
      let reporterOptions;
      if (this.config.get('mochaOpts.dryRun')) {
        // override default reporter for dryRun results
        const targetFile = Path.resolve(REPO_ROOT, 'target/functional-tests/dryRunOutput.json');
        reporter = 'json';
        reporterOptions = {
          output: targetFile,
        };
        this.log.info(`Dry run results will be stored in ${targetFile}`);
      }

      const mocha = await setupMocha({
        lifecycle,
        log: this.log,
        config: this.config,
        providers,
        esVersion: this.esVersion,
        reporter,
        reporterOptions,
      });

      // there's a bug in mocha's dry run, see https://github.com/mochajs/mocha/issues/4838
      // until we can update to a mocha version where this is fixed, we won't actually
      // execute the mocha dry run but simulate it by reading the suites and tests of
      // the mocha object and writing a report file with similar structure to the json report
      // (just leave out some execution details like timing, retry and erros)
      if (this.config.get('mochaOpts.dryRun')) {
        return this.simulateMochaDryRun(mocha);
      }

      if (abortSignal?.aborted) {
        this.log.warning('run aborted');
        return;
      }

      await lifecycle.beforeTests.trigger(mocha.suite);
      if (abortSignal?.aborted) {
        this.log.warning('run aborted');
        return;
      }

      this.log.info('Starting tests');
      return await runTests(lifecycle, mocha, abortSignal);
    });
  }

  private async validateEsVersion() {
    const es = createEsClientForFtrConfig(this.config);

    let esInfo;
    try {
      esInfo = await es.info();
    } catch (error) {
      throw new Error(
        `attempted to use the "es" service to fetch Elasticsearch version info but the request failed: ${error.stack}`
      );
    } finally {
      try {
        await es.close();
      } catch {
        // noop
      }
    }

    if (!this.esVersion.eql(esInfo.version.number)) {
      throw new Error(
        `ES reports a version number "${
          esInfo.version.number
        }" which doesn't match supplied es version "${this.esVersion.toString()}"`
      );
    }
  }

  async getTestStats() {
    return await this.runHarness(async (lifecycle, coreProviders) => {
      if (this.config.get('testRunner')) {
        return;
      }

      const providers = this.getStubProviderCollection(coreProviders);
      const mocha = await setupMocha({
        lifecycle,
        log: this.log,
        config: this.config,
        providers,
        esVersion: this.esVersion,
      });

      const queue = new Set([mocha.suite]);
      const allTests: Test[] = [];
      for (const suite of queue) {
        for (const test of suite.tests) {
          allTests.push(test);
        }
        for (const childSuite of suite.suites) {
          queue.add(childSuite);
        }
      }

      return {
        testCount: allTests.length,
        nonSkippedTestCount: allTests.filter((t) => !t.pending).length,
        testsExcludedByTag: mocha.testsExcludedByTag.map((t: Test) => t.fullTitle()),
      };
    });
  }

  private getStubProviderCollection(coreProviders: Providers) {
    // when we want to load the tests but not actually run anything we can
    // use stubbed providers which allow mocha to do it's thing without taking
    // too much time
    const readStubbedProviderSpec = (type: string, providers: any, skip: string[]) =>
      readProviderSpec(type, providers).map((p) => ({
        ...p,
        fn: skip.includes(p.name)
          ? (ctx: any) => {
              const result = ProviderCollection.callProviderFn(p.fn, ctx);

              if ('then' in result) {
                throw new Error(
                  `Provider [${p.name}] returns a promise so it can't loaded during test analysis`
                );
              }

              return result;
            }
          : () => ({
              then: () => {},
            }),
      }));

    return new ProviderCollection(this.log, [
      ...coreProviders,
      ...readStubbedProviderSpec(
        'Service',
        this.config.get('services'),
        this.config.get('servicesRequiredForTestAnalysis')
      ),
      ...readStubbedProviderSpec('PageObject', this.config.get('pageObjects'), []),
    ]);
  }

  private async runHarness<T = any>(
    handler: (lifecycle: Lifecycle, coreProviders: Providers) => Promise<T>
  ): Promise<T> {
    let runErrorOccurred = false;
    const lifecycle = new Lifecycle(this.log);

    try {
      if (
        this.config.module.type !== 'journey' &&
        (!this.config.get('testFiles') || this.config.get('testFiles').length === 0) &&
        !this.config.get('testRunner')
      ) {
        throw new Error('No tests defined.');
      }

      const dockerServers = new DockerServersService(
        this.config.get('dockerServers'),
        this.log,
        lifecycle
      );

      // base level services that functional_test_runner exposes
      const coreProviders = readProviderSpec('Service', {
        lifecycle: () => lifecycle,
        log: () => this.log,
        config: () => this.config,
        dockerServers: () => dockerServers,
        esVersion: () => this.esVersion,
        dedicatedTaskRunner: () => new DedicatedTaskRunner(this.config, this.log),
      });

      return await handler(lifecycle, coreProviders);
    } catch (runError) {
      runErrorOccurred = true;
      throw runError;
    } finally {
      try {
        await lifecycle.cleanup.trigger();
      } catch (closeError) {
        if (runErrorOccurred) {
          this.log.error('failed to close functional_test_runner');
          this.log.error(closeError);
        } else {
          // eslint-disable-next-line no-unsafe-finally
          throw closeError;
        }
      }
    }
  }

  simulateMochaDryRun(mocha: any) {
    interface TestEntry {
      file: string;
      title: string;
      fullTitle: string;
    }

    const getFullTitle = (node: Test | Suite): string => {
      const parentTitle = node.parent && getFullTitle(node.parent);
      return parentTitle ? `${parentTitle} ${node.title}` : node.title;
    };

    let suiteCount = 0;
    const passes: TestEntry[] = [];
    const pending: TestEntry[] = [];

    const collectTests = (suite: Suite) => {
      for (const subSuite of suite.suites) {
        suiteCount++;
        for (const test of subSuite.tests) {
          const testEntry = {
            title: test.title,
            fullTitle: getFullTitle(test),
            file: test.file || '',
          };
          if (test.pending) {
            pending.push(testEntry);
          } else {
            passes.push(testEntry);
          }
        }
        collectTests(subSuite);
      }
    };

    collectTests(mocha.suite);

    const reportData = {
      stats: {
        suites: suiteCount,
        tests: passes.length + pending.length,
        passes: passes.length,
        pending: pending.length,
        failures: 0,
      },
      tests: [...passes, ...pending],
      passes,
      pending,
      failures: [],
    };

    const reportPath = mocha.options.reporterOptions.output;
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');

    return 0;
  }
}
