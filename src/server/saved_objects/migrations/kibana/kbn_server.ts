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

import { SavedObjectsSchemaDefinition } from '../../schema';
import { CallCluster, LogFn } from '../core';

export interface KbnServer {
  server: Server;
  version: string;
  uiExports: {
    savedObjectMappings: any[];
    savedObjectMigrations: any;
    savedObjectValidations: any;
    savedObjectSchemas: SavedObjectsSchemaDefinition;
  };
}

export interface Server {
  log: LogFn;
  config: () => {
    get: {
      (path: 'kibana.index' | 'migrations.scrollDuration'): string;
      (path: 'migrations.batchSize' | 'migrations.pollInterval'): number;
    };
  };
  plugins: { elasticsearch: ElasticsearchPlugin | undefined };
}

interface ElasticsearchPlugin {
  getCluster: ((name: 'admin') => { callWithInternalUser: CallCluster });
  waitUntilReady: () => Promise<any>;
}
