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
import _ from 'lodash';
import sinon from 'sinon';
import { createMigrator } from './create_migrator';
import { getActiveMappings } from './mappings';
import { IndexMapping } from './types';

describe('migrator', async () => {
  test('reads the mapping for index', async () => {
    const index = randomName();
    const mappings = getActiveMappings([]);
    const callCluster = createCallCluster(createIndex(index, mappings));
    await createMigrator({
      callCluster,
      index,
      plugins: [],
    });

    sinon.assert.calledOnce(callCluster);
    sinon.assert.calledWithExactly(
      callCluster,
      'indices.getMapping',
      sinon.match({ index })
    );
  });

  describe('patchIndex', async () => {
    test('upgrades if mappings new mappings have been added', async () => {
      const index = randomName();
      const originalPlugins = [{ id: 'sample', mappings: randomMappings() }];
      const callCluster = createCallCluster(
        createIndex(index, getActiveMappings(originalPlugins))
      );
      const activePlugins = [
        ...originalPlugins,
        {
          id: 'dang',
          mappings: { dangIt: { type: 'keyword' } },
        },
      ];
      const migrator = await createMigrator({
        callCluster,
        index,
        plugins: activePlugins,
      });
      await migrator.patchIndex();
      const expectedMappings = getActiveMappings(activePlugins);

      sinon.assert.callCount(callCluster, 4);
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.exists',
        sinon.match({ index })
      );
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.getMapping',
        sinon.match({ index })
      );
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.putMapping',
        sinon.match({
          body: expectedMappings.doc,
          index,
          type: 'doc',
        })
      );
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.putTemplate',
        sinon.match({
          body: {
            mappings: expectedMappings,
            settings: {
              auto_expand_replicas: '0-1',
              number_of_shards: 1,
            },
            template: index,
          },
          name: `kibana_index_template:${index}`,
        })
      );
    });

    test('fails if destructive changes to mappings', async () => {
      const index = randomName();
      const originalPlugins = [
        {
          id: 'dang',
          mappings: { dangIt: { type: 'keyword' } },
        },
      ];
      const callCluster = createCallCluster(
        createIndex(index, getActiveMappings(originalPlugins))
      );
      const activePlugins = [
        {
          id: 'dang',
          mappings: { dangIt: { type: 'text' } },
        },
      ];
      await expect(
        createMigrator({
          callCluster,
          index,
          plugins: activePlugins,
        })
      ).rejects.toThrow(
        /Invalid mapping change: property "dangIt.type" changed from "keyword" to "text"/
      );
    });

    test('fails if plugins redefine mappings', async () => {
      const index = randomName();
      const plugins = [
        {
          id: 'dang',
          mappings: { aaa: { type: 'text' } },
        },
        {
          id: 'slang',
          mappings: { aaa: { type: 'text' } },
        },
      ];
      const callCluster = createCallCluster();
      await expect(
        createMigrator({
          callCluster,
          index,
          plugins,
        })
      ).rejects.toThrow(
        /Plugin "slang" is attempting to redefine mapping "aaa"/
      );
    });

    test('allows changes to dynamic types', async () => {
      const index = randomName();
      const originalPlugins = [
        {
          id: 'dang',
          mappings: {
            dangIt: {
              dynamic: true,
              name: { type: 'keyword' },
            },
          },
        },
      ];
      const callCluster = createCallCluster(
        createIndex(index, getActiveMappings(originalPlugins))
      );
      const activePlugins = [
        {
          id: 'dang',
          mappings: {
            dangIt: { dynamic: true },
          },
        },
      ];
      const migrator = await createMigrator({
        callCluster,
        index,
        plugins: activePlugins,
      });
      await expect(migrator).toBeTruthy();
    });

    test('ignores extra properties in the index', async () => {
      const index = randomName();
      const originalPlugins = [
        {
          id: 'sample',
          mappings: { shooo: { type: 'text' } },
        },
        {
          id: 'dang',
          mappings: { dangIt: { type: 'keyword' } },
        },
      ];
      const callCluster = createCallCluster(
        createIndex(index, getActiveMappings(originalPlugins))
      );
      const activePlugins = [originalPlugins[0]];
      const migrator = await createMigrator({
        callCluster,
        index,
        plugins: activePlugins,
      });
      await migrator.patchIndex();

      sinon.assert.callCount(callCluster, 4);
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.getMapping',
        sinon.match({ index })
      );
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.putMapping',
        sinon.match({
          body: {
            dynamic: 'strict',
            properties: {
              dangIt: { type: 'keyword' },
              shooo: { type: 'text' },
              type: { type: 'keyword' },
              updated_at: { type: 'date' },
            },
          },
          index,
          type: 'doc',
        })
      );
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.putTemplate',
        sinon.match({
          body: {
            mappings: {
              doc: {
                dynamic: 'strict',
                properties: {
                  config: {
                    dynamic: 'true',
                    properties: { buildNum: { type: 'keyword' } },
                  },
                  dangIt: { type: 'keyword' },
                  shooo: { type: 'text' },
                  type: { type: 'keyword' },
                  updated_at: { type: 'date' },
                },
              },
            },
            settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
            template: index,
          },
          name: `kibana_index_template:${index}`,
        })
      );
    });
  });
});

function randomName(names = ['hello', 'world', 'n', 'stuff']) {
  const name = names[_.random(0, names.length - 1)];
  return `${name}_${Math.random()}`;
}

function createIndex(name: string, mappings: IndexMapping) {
  return {
    [name]: {
      mappings,
    },
  };
}

interface Indices {
  [name: string]: { mappings: IndexMapping };
}

function createCallCluster(indices: Indices = {}) {
  return sinon.spy(async (method: string, params: any) => {
    switch (method) {
      case 'indices.getMapping':
        if (!indices[params.index]) {
          return Promise.reject({ status: 404 });
        } else {
          return Promise.resolve(_.cloneDeep(indices));
        }

      case 'indices.exists':
        return Promise.resolve(!!indices[params.index]);

      case 'indices.putMapping':
        return Promise.resolve({ ok: true });

      case 'indices.putTemplate':
        return Promise.resolve({ ok: true });

      default:
        return Promise.reject(
          new Error(`stub not expecting callCluster('${method}')`)
        );
    }
  });
}

function randomMappings(n = _.random(10, 20)) {
  return _.times(n, () => randomName()).reduce(
    (acc, prop) => ({
      ...acc,
      [prop]: {
        type: randomName(['keyword', 'text', 'integer', 'boolean']),
      },
    }),
    {}
  );
}
