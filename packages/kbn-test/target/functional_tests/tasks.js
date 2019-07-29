"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runTests = runTests;
exports.startServers = startServers;

var _path = require("path");

var Rx = _interopRequireWildcard(require("rxjs"));

var _operators = require("rxjs/operators");

var _devUtils = require("@kbn/dev-utils");

var _lib = require("./lib");

var _lib2 = require("../../../../src/functional_test_runner/lib");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${(0, _path.relative)(process.cwd(), _lib.KIBANA_FTR_SCRIPT)}

`;
/**
 * Run servers and tests for each config
 * @param {object} options                   Optional
 * @property {string[]} options.configs      Array of paths to configs
 * @property {function} options.log          An instance of the ToolingLog
 * @property {string} options.installDir     Optional installation dir from which to run Kibana
 * @property {boolean} options.bail          Whether to exit test run at the first failure
 * @property {string} options.esFrom         Optionally run from source instead of snapshot
 */

async function runTests(options) {
  for (const configPath of options.configs) {
    const log = options.createLogger();
    const opts = { ...options,
      log
    };
    log.info('Running', configPath);
    log.indent(2);

    if (options.assertNoneExcluded) {
      await (0, _lib.assertNoneExcluded)({
        configPath,
        options: opts
      });
      continue;
    }

    if (!(await (0, _lib.hasTests)({
      configPath,
      options: opts
    }))) {
      log.info('Skipping', configPath, 'since all tests are excluded');
      continue;
    }

    await (0, _devUtils.withProcRunner)(log, async procs => {
      const config = await (0, _lib2.readConfigFile)(log, configPath);
      const es = await (0, _lib.runElasticsearch)({
        config,
        options: opts
      });
      await (0, _lib.runKibanaServer)({
        procs,
        config,
        options: opts
      });
      await (0, _lib.runFtr)({
        configPath,
        options: opts
      });
      await procs.stop('kibana');
      await es.cleanup();
    });
  }
}
/**
 * Start only servers using single config
 * @param {object} options                   Optional
 * @property {string} options.config         Path to a config file
 * @property {function} options.log          An instance of the ToolingLog
 * @property {string} options.installDir     Optional installation dir from which to run Kibana
 * @property {string} options.esFrom         Optionally run from source instead of snapshot
 */


async function startServers(options) {
  const log = options.createLogger();
  const opts = { ...options,
    log
  };
  await (0, _devUtils.withProcRunner)(log, async procs => {
    const config = await (0, _lib2.readConfigFile)(log, options.config);
    const es = await (0, _lib.runElasticsearch)({
      config,
      options: opts
    });
    await (0, _lib.runKibanaServer)({
      procs,
      config,
      options: { ...opts,
        extraKbnOpts: [...options.extraKbnOpts, ...(options.installDir ? [] : ['--dev', '--no-dev-config'])]
      }
    }); // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried

    await silence(5000, {
      log
    });
    log.info(SUCCESS_MESSAGE);
    await procs.waitForAllToStop();
    await es.cleanup();
  });
}

async function silence(milliseconds, {
  log
}) {
  await log.getWritten$().pipe((0, _operators.startWith)(null), (0, _operators.switchMap)(() => Rx.timer(milliseconds)), (0, _operators.take)(1)).toPromise();
}