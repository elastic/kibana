import {
  createLifecycle,
  readConfigFile,
  createProviderCollection,
  setupMocha,
  runTests,
} from './lib';

export function createFunctionalTestRunner({ log, configFile, configOverrides }) {
  const lifecycle = createLifecycle();

  lifecycle.on('phaseStart', name => {
    log.verbose('starting %j lifecycle phase', name);
  });

  lifecycle.on('phaseEnd', name => {
    log.verbose('ending %j lifecycle phase', name);
  });

  class FunctionalTestRunner {
    async run() {
      let runErrorOccurred = false;

      try {
        const config = await readConfigFile(log, configFile, configOverrides);
        log.info('Config loaded');

        if (config.get('testFiles').length === 0) {
          log.warning('No test files defined.');
          return;
        }

        const providers = createProviderCollection(lifecycle, log, config);
        await providers.loadAll();

        const mocha = await setupMocha(lifecycle, log, config, providers);
        await lifecycle.trigger('beforeTests');
        log.info('Starting tests');
        return await runTests(lifecycle, log, mocha);

      } catch (runError) {
        runErrorOccurred = true;
        throw runError;

      } finally {
        try {
          await this.close();

        } catch (closeError) {
          if (runErrorOccurred) {
            log.error('failed to close functional_test_runner');
            log.error(closeError);
          } else {
            throw closeError;
          }
        }
      }
    }

    async close() {
      if (this._closed) return;

      this._closed = true;
      await lifecycle.trigger('cleanup');
    }
  }

  return new FunctionalTestRunner();
}
