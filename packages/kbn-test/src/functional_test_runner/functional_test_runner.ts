/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { loadConfiguration } from '@kbn/apm-config-loader';
import unloadedApm from 'elastic-apm-node';

type Agent = typeof unloadedApm;
type ApmTransaction = NonNullable<ReturnType<Agent['startTransaction']>>;

import { Suite, Test, Runnable } from './fake_mocha_types';
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

  // load APM config and start shipping stats for "ftr" service
  unloadedApm.start({
    ...loadConfiguration([], REPO_ROOT, false).getConfig('ftr'),
    // disable raw HTTP instrumentation, capture higher level spans instead via services
    disableInstrumentations: ['http', 'https'],
  });

  return (LOADED_APM = unloadedApm);
}

function printTitle(runnable: Runnable) {
  const titles: string[] = [];

  let cursor: Suite | Runnable | undefined = runnable;
  while (cursor) {
    const title = cursor.title?.trim();
    if (title && titles[0] !== title) {
      titles.unshift(title);
    }
    cursor = cursor.parent;
  }

  return titles.join(' > ');
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
    const apm = loadApm();

    return await this._run(async (config, coreProviders) => {
      const transactions = new WeakMap<Runnable, ApmTransaction | null>();
      const runnableErrors = new WeakMap<Runnable, Error>();

      this.lifecycle.beforeEachRunnable.add((runnable) => {
        let transaction: ApmTransaction | null = null;

        if (apm.isStarted()) {
          transaction = apm.startTransaction(printTitle(runnable), 'runnable');
          transaction?.setLabel('file', runnable.file ?? 'unknown');
          transaction?.setLabel('ownTitle', runnable.title);
          transaction?.setLabel('runnableType', runnable.type);
        }

        transactions.set(runnable, transaction);
      });

      this.lifecycle.failedRunnable.add((runnable, error) => {
        runnableErrors.set(runnable, error);
      });

      this.lifecycle.afterEachRunnable.add((runnable) => {
        const transaction = transactions.get(runnable);
        if (transaction === undefined) {
          throw new Error(`beforeEachRunnable() was not triggered for test: ${inspect(runnable)}`);
        }

        if (transaction !== null) {
          const error = runnableErrors.get(runnable);
          transaction.setOutcome(error ? 'failure' : 'success');
          transaction.end();
        }
      });

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

      const mocha = await setupMocha(this.lifecycle, this.log, config, providers, apm);
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
      const readStubbedProviderSpec = (type: string, providers: any) =>
        readProviderSpec(type, providers).map((p) => ({
          ...p,
          fn: () => ({
            then: () => {},
          }),
        }));

      const providers = new ProviderCollection(this.log, [
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
        failureMetadata: () => this.failureMetadata,
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
