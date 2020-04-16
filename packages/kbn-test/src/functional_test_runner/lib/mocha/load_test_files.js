/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
export const loadTestFiles = ({ mocha, log, lifecycle, providers, paths, updateBaselines }) => {
  const innerLoadTestFile = path => {
    if (typeof path !== 'string' || !isAbsolute(path)) {
      throw new TypeError('loadTestFile() only accepts absolute paths');
    }

    loadTracer(path, `testFile[${path}]`, () => {
      log.verbose('Loading test file %s', path);

      const testModule = require(path); // eslint-disable-line import/no-dynamic-require
      const testProvider = testModule.__esModule ? testModule.default : testModule;

      runTestProvider(testProvider, path); // eslint-disable-line
    });
  };

  const runTestProvider = (provider, path) => {
    if (typeof provider !== 'function') {
      throw new Error(`Default export of test files must be a function, got ${provider}`);
    }

    loadTracer(provider, `testProvider[${path}]`, () => {
      // mocha.suite hocus-pocus comes from: https://git.io/vDnXO

      const context = decorateMochaUi(lifecycle, global);
      mocha.suite.emit('pre-require', context, path, mocha);

      const returnVal = provider({
        loadTestFile: innerLoadTestFile,
        getService: providers.getService,
        getPageObject: providers.getPageObject,
        getPageObjects: providers.getPageObjects,
        updateBaselines,
      });

      if (returnVal && typeof returnVal.then === 'function') {
        throw new TypeError('Default export of test files must not be an async function');
      }

      mocha.suite.emit('require', returnVal, path, mocha);
      mocha.suite.emit('post-require', global, path, mocha);

      context.revertProxiedAssignments();
    });
  };

  paths.forEach(innerLoadTestFile);
};
