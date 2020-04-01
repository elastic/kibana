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

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  TestUtils,
  createRootWithCorePlugins,
  getKbnServer,
} from '../../../../test_utils/kbn_server';

import { BehaviorSubject } from 'rxjs';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { NodesVersionCompatibility } from 'src/core/server/elasticsearch/version_check/ensure_es_version';

describe('Elasticsearch plugin', () => {
  let servers: TestUtils;
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let elasticsearch: TestKibanaUtils['kbnServer']['server']['plugins']['elasticsearch'];

  const esNodesCompatibility$ = new BehaviorSubject<NodesVersionCompatibility>({
    isCompatible: true,
    incompatibleNodes: [],
    warningNodes: [],
    kibanaVersion: '8.0.0',
  });

  beforeAll(async function() {
    const settings = {
      elasticsearch: {},
      adjustTimeout: (t: any) => {
        jest.setTimeout(t);
      },
    };
    servers = createTestServers(settings);
    esServer = await servers.startES();

    const elasticsearchSettings = {
      hosts: esServer.hosts,
      username: esServer.username,
      password: esServer.password,
    };
    root = createRootWithCorePlugins({ elasticsearch: elasticsearchSettings });

    const setup = await root.setup();
    setup.elasticsearch.esNodesCompatibility$ = esNodesCompatibility$;
    await root.start();

    elasticsearch = getKbnServer(root).server.plugins.elasticsearch;
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  }, 30000);

  it("should set it's status to green when all nodes are compatible", done => {
    jest.setTimeout(30000);
    elasticsearch.status.on('green', () => done());
  });

  it("should set it's status to red when some nodes aren't compatible", done => {
    esNodesCompatibility$.next({
      isCompatible: false,
      incompatibleNodes: [],
      warningNodes: [],
      kibanaVersion: '8.0.0',
    });
    elasticsearch.status.on('red', () => done());
  });
});
