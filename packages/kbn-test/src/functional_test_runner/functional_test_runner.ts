/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync, mkdirSync } from 'fs';
import Path, { dirname } from 'path';
import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

import { Suite, Test } from './fake_mocha_types';
import {
  Lifecycle,
  LifecyclePhase,
  TestMetadata,
  readConfigFile,
  ProviderCollection,
  readProviderSpec,
  setupMocha,
  runTests,
  DockerServersService,
  Config,
  SuiteTracker,
  EsVersion,
} from './lib';
import { createEsClientForFtrConfig } from '../es';

export class FunctionalTestRunner {
  public readonly lifecycle = new Lifecycle();
  public readonly testMetadata = new TestMetadata(this.lifecycle);
  private closed = false;

  private readonly esVersion: EsVersion;
  constructor(
    private readonly log: ToolingLog,
    private readonly configFile: string,
    private readonly configOverrides: any,
    esVersion?: string | EsVersion
  ) {
    for (const [key, value] of Object.entries(this.lifecycle)) {
      if (value instanceof LifecyclePhase) {
        value.before$.subscribe(() => log.verbose('starting %j lifecycle phase', key));
        value.after$.subscribe(() => log.verbose('starting %j lifecycle phase', key));
      }
    }
    this.esVersion =
      esVersion === undefined
        ? EsVersion.getDefault()
        : esVersion instanceof EsVersion
        ? esVersion
        : new EsVersion(esVersion);
  }

  async run() {
    return await this._run(async (config, coreProviders) => {
      SuiteTracker.startTracking(this.lifecycle, this.configFile);

      const providers = new ProviderCollection(this.log, [
        ...coreProviders,
        ...readProviderSpec('Service', config.get('services')),
        ...readProviderSpec('PageObject', config.get('pageObjects')),
      ]);

      if (providers.hasService('es')) {
        await this.validateEsVersion(config);
      }
      await providers.loadAll();

      const customTestRunner = config.get('testRunner');
      if (customTestRunner) {
        this.log.warning(
          'custom test runner defined, ignoring all mocha/suite/filtering related options'
        );
        return (await providers.invokeProviderFn(customTestRunner)) || 0;
      }

      let reporter;
      let reporterOptions;
      if (config.get('mochaOpts.dryRun')) {
        // override default reporter for dryRun results
        const targetFile = Path.resolve(REPO_ROOT, 'target/functional-tests/dryRunOutput.json');
        reporter = 'json';
        reporterOptions = {
          output: targetFile,
        };
        this.log.info(`Dry run results will be stored in ${targetFile}`);
      }

      const mocha = await setupMocha(
        this.lifecycle,
        this.log,
        config,
        providers,
        this.esVersion,
        reporter,
        reporterOptions
      );

      // there's a bug in mocha's dry run, see https://github.com/mochajs/mocha/issues/4838
      // until we can update to a mocha version where this is fixed, we won't actually
      // execute the mocha dry run but simulate it by reading the suites and tests of
      // the mocha object and writing a report file with similar structure to the json report
      // (just leave out some execution details like timing, retry and erros)
      if (config.get('mochaOpts.dryRun')) {
        return this.simulateMochaDryRun(mocha);
      }

      await this.lifecycle.beforeTests.trigger(mocha.suite);
      this.log.info('Starting tests');

      return await runTests(this.lifecycle, mocha);
    });
  }

  private async validateEsVersion(config: Config) {
    const es = createEsClientForFtrConfig(config);

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
    return await this._run(async (config, coreProviders) => {
      if (config.get('testRunner')) {
        throw new Error('Unable to get test stats for config that uses a custom test runner');
      }

      // replace the function of custom service providers so that they return
      // promise-like objects which never resolve, essentially disabling them
      // allowing us to load the test files and populate the mocha suites
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

      const providers = new ProviderCollection(this.log, [
        ...coreProviders,
        ...readStubbedProviderSpec(
          'Service',
          config.get('services'),
          config.get('servicesRequiredForTestAnalysis')
        ),
        ...readStubbedProviderSpec('PageObject', config.get('pageObjects'), []),
      ]);

      const mocha = await setupMocha(this.lifecycle, this.log, config, providers, this.esVersion);

      const countTests = (suite: Suite): number =>
        suite.suites.reduce((sum, s) => sum + countTests(s), suite.tests.length);

      return {
        testCount: countTests(mocha.suite),
        testsExcludedByTag: mocha.testsExcludedByTag.map((t: Test) => t.fullTitle()),
      };
    });
  }

  async _run<T = any>(
    handler: (config: Config, coreProvider: ReturnType<typeof readProviderSpec>) => Promise<T>
  ): Promise<T> {
    let runErrorOccurred = false;

    try {
      const config = await readConfigFile(
        this.log,
        this.esVersion,
        this.configFile,
        this.configOverrides
      );
      this.log.info('Config loaded');

      if (
        (!config.get('testFiles') || config.get('testFiles').length === 0) &&
        !config.get('testRunner')
      ) {
        throw new Error('No tests defined.');
      }

      const dockerServers = new DockerServersService(
        config.get('dockerServers'),
        this.log,
        this.lifecycle
      );

      // base level services that functional_test_runner exposes
      const coreProviders = readProviderSpec('Service', {
        lifecycle: () => this.lifecycle,
        log: () => this.log,
        testMetadata: () => this.testMetadata,
        config: () => config,
        dockerServers: () => dockerServers,
        esVersion: () => this.esVersion,
      });

      return await handler(config, coreProviders);
    } catch (runError) {
      runErrorOccurred = true;
      throw runError;
    } finally {
      try {
        await this.close();
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

  async close() {
    if (this.closed) return;

    this.closed = true;
    await this.lifecycle.cleanup.trigger();
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
