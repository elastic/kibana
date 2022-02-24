/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';

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
} from './lib';

export class FunctionalTestRunner {
  public readonly lifecycle = new Lifecycle();
  public readonly testMetadata = new TestMetadata(this.lifecycle);
  private closed = false;

  constructor(
    private readonly log: ToolingLog,
    private readonly configFile: string,
    private readonly configOverrides: any
  ) {
    for (const [key, value] of Object.entries(this.lifecycle)) {
      if (value instanceof LifecyclePhase) {
        value.before$.subscribe(() => log.verbose('starting %j lifecycle phase', key));
        value.after$.subscribe(() => log.verbose('starting %j lifecycle phase', key));
      }
    }
  }

  async run() {
    return await this._run(async (config, coreProviders) => {
      SuiteTracker.startTracking(this.lifecycle, this.configFile);

      const providers = new ProviderCollection(this.log, [
        ...coreProviders,
        ...readProviderSpec('Service', config.get('services')),
        ...readProviderSpec('PageObject', config.get('pageObjects')),
      ]);

      await providers.loadAll();

      const customTestRunner = config.get('testRunner');
      if (customTestRunner) {
        this.log.warning(
          'custom test runner defined, ignoring all mocha/suite/filtering related options'
        );
        return (await providers.invokeProviderFn(customTestRunner)) || 0;
      }

      const mocha = await setupMocha(this.lifecycle, this.log, config, providers);
      await this.lifecycle.beforeTests.trigger(mocha.suite);
      this.log.info('Starting tests');

      return await runTests(this.lifecycle, mocha);
    });
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
            ? (...args: unknown[]) => {
                const result = p.fn(...args);
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

      const mocha = await setupMocha(this.lifecycle, this.log, config, providers);

      const countTests = (suite: Suite): number =>
        suite.suites.reduce((sum, s) => sum + countTests(s), suite.tests.length);

      return {
        testCount: countTests(mocha.suite),
        excludedTests: mocha.excludedTests.map((t: Test) => t.fullTitle()),
      };
    });
  }

  async _run<T = any>(
    handler: (config: Config, coreProvider: ReturnType<typeof readProviderSpec>) => Promise<T>
  ): Promise<T> {
    let runErrorOccurred = false;

    try {
      const config = await readConfigFile(this.log, this.configFile, this.configOverrides);
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
}
