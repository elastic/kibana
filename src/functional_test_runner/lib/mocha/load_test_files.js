import { isAbsolute } from 'path';

import { loadTracer } from '../load_tracer';
import { decorateMochaUi } from './decorate_mocha_ui';

/**
 *  Load an array of test files into a mocha instance
 *
 *  @param  {Mocha} mocha
 *  @param  {ToolingLog} log
 *  @param  {ProviderCollection} providers
 *  @param  {String} path
 *  @return {undefined} - mutates mocha, no return value
 */
export const loadTestFiles = (mocha, log, lifecycle, providers, paths) => {
  const innerLoadTestFile = (path) => {
    if (typeof path !== 'string' || !isAbsolute(path)) {
      throw new TypeError('loadTestFile() only accepts absolute paths');
    }

    loadTracer(path, `testFile[${path}]`, () => {
      log.verbose('Loading test file %s', path);

      const testModule = require(path);
      const testProvider = testModule.__esModule
        ? testModule.default
        : testModule;

      runTestProvider(testProvider, path); // eslint-disable-line
    });
  };

  const runTestProvider = (provider, path) => {
    if (typeof provider !== 'function') {
      throw new Error(`Default export of test files must be a function, got ${provider}`);
    }

    loadTracer(provider, `testProvider[${path}]`, () => {
      // mocha.suite hocus-pocus comes from: https://git.io/vDnXO

      mocha.suite.emit('pre-require', decorateMochaUi(lifecycle, global), path, mocha);

      const returnVal = provider({
        loadTestFile: innerLoadTestFile,
        getService: providers.getService,
        getPageObject: providers.getPageObject,
        getPageObjects: providers.getPageObjects,
      });

      if (returnVal && typeof returnVal.then === 'function') {
        throw new TypeError('Default export of test files must not be an async function');
      }

      mocha.suite.emit('require', returnVal, path, mocha);
      mocha.suite.emit('post-require', global, path, mocha);
    });
  };

  paths.forEach(innerLoadTestFile);
};
