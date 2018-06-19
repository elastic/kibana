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

import { MigrationPlugin } from '../core';
import { KibanaPlugin } from './types';

export interface PluginSpecable {
  pluginSpecs: KibanaPlugin[];
}

/**
 * getMigrationPlugins extracts migration plugins from kbnServer. Migration
 * plugins are a simple data structure that the core migration system expects.
 *
 * @param {KbnServer} kbnServer - An instance of the Kibana server
 * @returns {MigrationPlugin[]}
 */
export function getMigrationPlugins({
  pluginSpecs,
}: PluginSpecable): MigrationPlugin[] {
  const emptySpec = { mappings: undefined };
  return pluginSpecs
    .map(p => ({
      id: p.getId(),
      mappings: (p.getExportSpecs() || emptySpec).mappings,
    }))
    .filter(p => !!p.mappings);
}
