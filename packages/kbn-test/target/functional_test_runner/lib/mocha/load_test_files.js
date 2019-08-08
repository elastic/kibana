"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadTestFiles = void 0;

var _path = require("path");

var _load_tracer = require("../load_tracer");

var _decorate_mocha_ui = require("./decorate_mocha_ui");

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

/**
 *  Load an array of test files into a mocha instance
 *
 *  @param  {Mocha} mocha
 *  @param  {ToolingLog} log
 *  @param  {ProviderCollection} providers
 *  @param  {String} path
 *  @return {undefined} - mutates mocha, no return value
 */
const loadTestFiles = ({
  mocha,
  log,
  lifecycle,
  providers,
  paths,
  excludePaths,
  updateBaselines
}) => {
  const pendingExcludes = new Set(excludePaths.slice(0));

  const innerLoadTestFile = path => {
    if (typeof path !== 'string' || !(0, _path.isAbsolute)(path)) {
      throw new TypeError('loadTestFile() only accepts absolute paths');
    }

    if (pendingExcludes.has(path)) {
      pendingExcludes.delete(path);
      log.warning('Skipping test file %s', path);
      return;
    }

    (0, _load_tracer.loadTracer)(path, `testFile[${path}]`, () => {
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

    (0, _load_tracer.loadTracer)(provider, `testProvider[${path}]`, () => {
      // mocha.suite hocus-pocus comes from: https://git.io/vDnXO
      const context = (0, _decorate_mocha_ui.decorateMochaUi)(lifecycle, global);
      mocha.suite.emit('pre-require', context, path, mocha);
      const returnVal = provider({
        loadTestFile: innerLoadTestFile,
        getService: providers.getService,
        getPageObject: providers.getPageObject,
        getPageObjects: providers.getPageObjects,
        updateBaselines
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

  if (pendingExcludes.size) {
    throw new Error(`After loading all test files some exclude paths were not consumed:${['', ...pendingExcludes].join('\n  -')}`);
  }
};

exports.loadTestFiles = loadTestFiles;