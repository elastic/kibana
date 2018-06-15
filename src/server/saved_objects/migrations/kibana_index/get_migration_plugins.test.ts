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

import { SavedObjectDoc } from '../core';
import { getMigrationPlugins } from './get_migration_plugins';

describe('getMigrationPlugins', () => {
  test('converts Kibana plugins to migration plugins', async () => {
    const pluginSpecs = [
      {
        getExportSpecs: () => ({
          mappings: {
            hoi: { type: 'text' },
          },
        }),
        getId: () => 'hello',
        getMigrations: () => undefined,
      },
      {
        getExportSpecs: () => undefined,
        getId: () => 'nuthin',
        getMigrations: () => undefined,
      },
      {
        getExportSpecs: () => ({
          mappings: {
            fud: {
              properties: {
                name: { type: 'text' },
              },
            },
          },
        }),
        getId: () => 'sumthin',
        getMigrations: () => ({
          fud: {
            4: (doc: SavedObjectDoc) => ({
              ...doc,
              attributes: { ...doc.attributes, name: 'Jimbo' },
            }),
          },
          mud: {
            3: (doc: SavedObjectDoc) => ({ ...doc, type: 'fud' }),
          },
        }),
      },
    ];
    const plugins = getMigrationPlugins({ pluginSpecs });
    expect(plugins).toMatchSnapshot();
  });
});
