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

import Hapi from 'hapi';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { defaultValidationErrorHandler } from '../../../../core/server/http/http_tools';

const defaultConfig = {
  'kibana.index': '.kibana',
  'savedObjects.maxImportExportSize': 10000,
  'savedObjects.maxImportPayloadBytes': 52428800,
};

export function createMockServer(config: { [key: string]: any } = defaultConfig) {
  const server = new Hapi.Server({
    port: 0,
    routes: {
      validate: {
        failAction: defaultValidationErrorHandler,
      },
    },
  });
  server.config = () => {
    return {
      get(key: string) {
        return config[key];
      },
      has(key: string) {
        return config.hasOwnProperty(key);
      },
    };
  };

  return server;
}
