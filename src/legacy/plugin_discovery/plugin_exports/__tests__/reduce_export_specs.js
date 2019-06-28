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

import expect from '@kbn/expect';

import { PluginPack } from '../../plugin_pack';
import { reduceExportSpecs } from '../reduce_export_specs';

const PLUGIN = new PluginPack({
  path: __dirname,
  pkg: {
    name: 'foo',
    version: 'kibana'
  },
  provider: ({ Plugin }) => (
    new Plugin({
      uiExports: {
        concatNames: {
          name: 'export1'
        },

        concat: [
          'export2',
          'export3',
        ],
      }
    })
  )
});

const REDUCERS = {
  concatNames(acc, spec, type, pluginSpec) {
    return {
      names: [].concat(
        acc.names || [],
        `${pluginSpec.getId()}:${spec.name}`,
      )
    };
  },
  concat(acc, spec, type, pluginSpec) {
    return {
      names: [].concat(
        acc.names || [],
        `${pluginSpec.getId()}:${spec}`,
      )
    };
  },
};

const PLUGIN_SPECS = PLUGIN.getPluginSpecs();

describe('reduceExportSpecs', () => {
  it('combines ui exports from a list of plugin definitions', () => {
    const exports = reduceExportSpecs(PLUGIN_SPECS, REDUCERS);
    expect(exports).to.eql({
      names: [
        'foo:export1',
        'foo:export2',
        'foo:export3',
      ]
    });
  });

  it('starts with the defaults', () => {
    const exports = reduceExportSpecs(PLUGIN_SPECS, REDUCERS, {
      names: [
        'default'
      ]
    });

    expect(exports).to.eql({
      names: [
        'default',
        'foo:export1',
        'foo:export2',
        'foo:export3',
      ]
    });
  });
});
