import Mocha from 'mocha';

import { loadTestFiles } from './load_test_files';

/**
 *  Instansiate mocha and load testfiles into it
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Config} config
 *  @param  {ProviderCollection} providers
 *  @return {Promise<Mocha>}
 */
export async function setupMocha(lifecycle, log, config, providers) {
  // configure mocha
  const mocha = new Mocha({
    timeout: config.get('timeouts.test'),
    ...config.get('mochaOpts'),
    reporter: await providers.loadExternalService(
      'configured mocha reporter',
      config.get('mochaOpts.reporterProvider')
    )
  });

  // global beforeEach hook in root suite triggers before all others
  mocha.suite.beforeEach('global before each', async () => {
    await lifecycle.trigger('beforeEachTest');
  });

  loadTestFiles(mocha, log, lifecycle, providers, config.get('testFiles'));
  return mocha;
}
