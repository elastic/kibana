"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createEsTestCluster = createEsTestCluster;

var _path = require("path");

var _url = require("url");

var _lodash = require("lodash");

var _toPath = _interopRequireDefault(require("lodash/internal/toPath"));

var _es = require("@kbn/es");

var _es_test_config = require("./es_test_config");

var _ = require("../");

var _elasticsearch = _interopRequireDefault(require("elasticsearch"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const path = require('path');

const del = require('del');

function createEsTestCluster(options = {}) {
  const {
    port = _es_test_config.esTestConfig.getPort(),
    password = 'changeme',
    license = 'oss',
    log,
    basePath = (0, _path.resolve)(_.KIBANA_ROOT, '.es'),
    esFrom = _es_test_config.esTestConfig.getBuildFrom(),
    dataArchive,
    esArgs
  } = options;
  const randomHash = Math.random().toString(36).substring(2);
  const clusterName = `test-${randomHash}`;
  const config = {
    version: _es_test_config.esTestConfig.getVersion(),
    installPath: (0, _path.resolve)(basePath, clusterName),
    sourcePath: (0, _path.resolve)(_.KIBANA_ROOT, '../elasticsearch'),
    password,
    license,
    basePath,
    esArgs
  };
  const cluster = new _es.Cluster({
    log
  });
  return new class EsTestCluster {
    getStartTimeout() {
      const second = 1000;
      const minute = second * 60;
      return esFrom === 'snapshot' ? 3 * minute : 6 * minute;
    }

    async start(esArgs = [], esEnvVars) {
      let installPath;

      if (esFrom === 'source') {
        installPath = (await cluster.installSource(config)).installPath;
      } else if (esFrom === 'snapshot') {
        installPath = (await cluster.installSnapshot(config)).installPath;
      } else if (path.isAbsolute(esFrom)) {
        installPath = esFrom;
      } else {
        throw new Error(`unknown option esFrom "${esFrom}"`);
      }

      if (dataArchive) {
        await cluster.extractDataDirectory(installPath, dataArchive);
      }

      await cluster.start(installPath, {
        password: config.password,
        esArgs: [`cluster.name=${clusterName}`, `http.port=${port}`, 'discovery.type=single-node', ...esArgs],
        esEnvVars
      });
    }

    async stop() {
      await cluster.stop();
      log.info('[es] stopped');
    }

    async cleanup() {
      await this.stop();
      await del(config.installPath, {
        force: true
      });
      log.info('[es] cleanup complete');
    }
    /**
     * Returns an ES Client to the configured cluster
     */


    getClient() {
      return new _elasticsearch.default.Client({
        host: this.getUrl()
      });
    }

    getCallCluster() {
      return createCallCluster(this.getClient());
    }

    getUrl() {
      const parts = _es_test_config.esTestConfig.getUrlParts();

      parts.port = port;
      return (0, _url.format)(parts);
    }

  }();
}
/**
 *  Create a callCluster function that properly executes methods on an
 *  elasticsearch-js client
 *
 *  @param  {elasticsearch.Client} esClient
 *  @return {Function}
 */


function createCallCluster(esClient) {
  return function callCluster(method, params) {
    const path = (0, _toPath.default)(method);
    const contextPath = path.slice(0, -1);
    const action = (0, _lodash.get)(esClient, path);
    const context = contextPath.length ? (0, _lodash.get)(esClient, contextPath) : esClient;
    return action.call(context, params);
  };
}