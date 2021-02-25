/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { loadConfiguration } from '@kbn/apm-config-loader';
import type { start } from 'elastic-apm-node';

type Agent = ReturnType<typeof start>;
type ApmTransaction = NonNullable<ReturnType<Agent['startTransaction']>>;

import { Suite, Test } from './fake_mocha_types';
import {
  Lifecycle,
  LifecyclePhase,
  FailureMetadata,
  readConfigFile,
  ProviderCollection,
  readProviderSpec,
  setupMocha,
  runTests,
  DockerServersService,
  Config,
  SuiteTracker,
} from './lib';

let LOADED_APM: Agent | null = null;
function loadApm() {
  if (LOADED_APM) {
    return LOADED_APM;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LOADED_APM = require('elastic-apm-node') as Agent;

  // load APM config and start shipping stats for "ftr" service
  LOADED_APM.start({
    ...loadConfiguration([], REPO_ROOT, false).getConfig('ftr'),
    // disable raw HTTP instrumentation, capture higher level spans instead via services
    disableInstrumentations: ['http', 'https'],
  });

  return LOADED_APM;
}

export class FunctionalTestRunner {
  public readonly lifecycle = new Lifecycle();
  public readonly failureMetadata = new FailureMetadata(this.lifecycle);
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
    // use a single transaction for now
    const transaction = loadApm().startTransaction('functional tests');

    return await this._run(async (config, coreProviders) => {
      SuiteTracker.startTracking(this.lifecycle, this.configFile);

      const providers = new ProviderCollection(
        this.log,
        transaction ? (x0, x1, x2, x3) => transaction?.startSpan(x0, x1, x2, x3) : null,
        [
          ...coreProviders,
          ...readProviderSpec('Service', config.get('services')),
          ...readProviderSpec('PageObject', config.get('pageObjects')),
        ]
      );

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
    }, transaction);
  }

  async getTestStats() {
    return await this._run(async (config, coreProviders) => {
      if (config.get('testRunner')) {
        throw new Error('Unable to get test stats for config that uses a custom test runner');
      }

      // replace the function of custom service providers so that they return
      // promise-like objects which never resolve, essentially disabling them
      // allowing us to load the test files and populate the mocha suites
      const readStubbedProviderSpec = (type: string, providers: any) =>
        readProviderSpec(type, providers).map((p) => ({
          ...p,
          fn: () => ({
            then: () => {},
          }),
        }));

      const providers = new ProviderCollection(this.log, null, [
        ...coreProviders,
        ...readStubbedProviderSpec('Service', config.get('services')),
        ...readStubbedProviderSpec('PageObject', config.get('pageObjects')),
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
    handler: (config: Config, coreProvider: ReturnType<typeof readProviderSpec>) => Promise<T>,
    apmTransaction?: ApmTransaction | null
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
        failureMetadata: () => this.failureMetadata,
        config: () => config,
        dockerServers: () => dockerServers,
      });

      return await handler(config, coreProviders);
    } catch (runError) {
      runErrorOccurred = true;
      throw runError;
    } finally {
      apmTransaction?.end();

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
