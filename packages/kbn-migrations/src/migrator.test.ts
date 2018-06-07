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
import { buildMappings } from './mapping';
import { createMigrator } from './migrator';
import { IndexMapping } from './types';

describe('migrations migrator', async () => {
  const log = sinon.spy();

  test('reads the mapping for index', async () => {
    const index = randomName();
    const mappings = buildMappings('7.0.0', []);
    const callCluster = createCallCluster(createIndex(index, mappings));
    await createMigrator({
      callCluster,
      index,
      kibanaVersion: '7.0.0',
      log,
      plugins: [],
    });

    sinon.assert.calledOnce(callCluster);
    sinon.assert.calledWithExactly(
      callCluster,
      'indices.getMapping',
      sinon.match({ index })
    );
  });

  describe('migrate', async () => {
    test('does nothing if the index does not exist', async () => {
      const index = randomName();
      const callCluster = createCallCluster();
      const plugins = [
        {
          id: 'sample',
          mappings: randomMappings(),
        },
      ];
      const migrator = await createMigrator({
        callCluster,
        index,
        kibanaVersion: '7.0.0',
        log,
        plugins,
      });
      await migrator.migrateIndex();

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.getMapping',
        sinon.match({ index })
      );
    });

    test('does nothing if versions and mappings match', async () => {
      const index = randomName();
      const plugins = [
        {
          id: 'sample',
          mappings: randomMappings(),
        },
      ];
      const callCluster = createCallCluster(
        createIndex(index, buildMappings('7.0.0', plugins))
      );
      const migrator = await createMigrator({
        callCluster,
        index,
        kibanaVersion: '7.0.0',
        log,
        plugins,
      });
      await migrator.migrateIndex();

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.getMapping',
        sinon.match({ index })
      );
    });

    test('upgrades if mappings new mappings have been added', async () => {
      const index = randomName();
      const originalPlugins = [{ id: 'sample', mappings: randomMappings() }];
      const callCluster = createCallCluster(
        createIndex(index, buildMappings('7.0.0', originalPlugins))
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
        kibanaVersion: '7.0.0',
        log,
        plugins: activePlugins,
      });
      await migrator.migrateIndex();
      const expectedMappings = buildMappings('7.0.0', activePlugins);

      sinon.assert.calledThrice(callCluster);
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

    test('fails if downgrading', async () => {
      const index = randomName();
      const plugins = [
        {
          id: 'sample',
          mappings: randomMappings(),
        },
      ];
      const callCluster = createCallCluster(
        createIndex(index, buildMappings('7.0.1', plugins))
      );
      const migrator = await createMigrator({
        callCluster,
        index,
        kibanaVersion: '7.0.0',
        log,
        plugins,
      });

      await expect(migrator.migrateIndex()).rejects.toThrow(
        /Cannot automatically downgrade from "7.0.1" to "7.0.0"/
      );
    });

    test('ignores extra properties in the index', async () => {
      const index = randomName();
      const originalPlugins = [
        { id: 'sample', mappings: randomMappings() },
        {
          id: 'dang',
          mappings: { dangIt: { type: 'keyword' } },
        },
      ];
      const callCluster = createCallCluster(
        createIndex(index, buildMappings('7.0.0', originalPlugins))
      );
      const activePlugins = [originalPlugins[0]];
      const migrator = await createMigrator({
        callCluster,
        index,
        kibanaVersion: '7.0.0',
        log,
        plugins: activePlugins,
      });
      await migrator.migrateIndex();

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(
        callCluster,
        'indices.getMapping',
        sinon.match({ index })
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
