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

import { routes } from './server/routes';
import { FunctionsRegistry, TypesRegistry } from '@kbn/interpreter/common';
import { populateServerRegistries } from '@kbn/interpreter/server';

export default async function (server /*options*/) {

  const registries = {
    serverFunctions: new FunctionsRegistry(),
    types: new TypesRegistry()
  };

  server.injectUiAppVars('canvas', () => {
    const config = server.config();
    const basePath = config.get('server.basePath');
    const reportingBrowserType = (() => {
      const configKey = 'xpack.reporting.capture.browser.type';
      if (!config.has(configKey)) return null;
      return config.get(configKey);
    })();

    return {
      kbnIndex: config.get('kibana.index'),
      esShardTimeout: config.get('elasticsearch.shardTimeout'),
      esApiVersion: config.get('elasticsearch.apiVersion'),
      serverFunctions: registries.serverFunctions.toArray(),
      basePath,
      reportingBrowserType,
    };
  });

  await populateServerRegistries(registries);

  server.expose(registries);
  routes(server);
}
