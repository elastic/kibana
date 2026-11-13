/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import { CPS_METADATA_FIELDS, METADATA_FIELDS } from '../../../commands/registry/options/metadata';
import {
  ENTITY_TYPES,
  METADATA_FIELD_NAMES,
  SERVERLESS_METADATA_FIELD_NAMES,
  type EntityItem,
  type EntityScope,
  type EntityType,
} from '../../../esql_js_sim/definitions';
import { ENTITIES } from './registry';

const callbacks: ESQLCallbacks = {
  getSources: async () => [
    { name: 'logs', hidden: false, type: 'Index' },
    { name: '.internal', hidden: true, type: 'Index' },
    { name: 'nginx', hidden: false, type: 'Integration', dataStreams: [{ name: 'nginx.access' }] },
  ],
  getViews: async () => ({ views: [{ name: 'my_view', query: 'FROM logs' }] }),
  getDatasets: async () => ({
    datasets: [{ name: 'my_dataset', data_source: 's3', resource: 's3://bucket' }],
  }),
  getTimeseriesIndices: async () => ({
    indices: [{ name: 'metrics', mode: 'Timeseries', aliases: ['metrics_alias'] }],
  }),
  getJoinIndices: async () => ({
    indices: [{ name: 'lookup', mode: 'Lookup', aliases: ['lookup_alias'] }],
  }),
  getPolicies: async () => [
    { name: 'policy', sourceIndices: ['enrich_index'], matchField: 'id', enrichFields: ['a', 'b'] },
  ],
  getInferenceEndpoints: async (taskType) => ({
    inferenceEndpoints: [
      { inference_id: 'rerank_1', task_type: 'rerank' },
      { inference_id: 'completion_1', task_type: 'completion' },
    ].filter(({ task_type: type }) => type === taskType),
  }),
};

const scope = (fields: Partial<EntityScope> = {}): EntityScope => ({
  inSubquery: false,
  isServerless: false,
  ...fields,
});

const names = (items: EntityItem[]): string[] => items.map(({ name }) => name);

// One row at least per kind of entity: what a scope gives with these callbacks.
const CONTRACT: Record<EntityType, Array<[string, EntityScope, string[]]>> = {
  source: [
    [
      'every source, view and dataset',
      scope(),
      ['logs', '.internal', 'nginx', 'my_view', 'my_dataset'],
    ],
    ['time-series sources only', scope({ indexMode: 'time_series' }), ['metrics']],
  ],
  lookup_index: [['the lookup indices', scope(), ['lookup']]],
  enrich_policy: [['the policies', scope(), ['policy']]],
  enrich_field: [
    ['the fields of the parent policy', scope({ parent: 'policy' }), ['a', 'b']],
    ['nothing without a known parent', scope({ parent: 'other' }), []],
  ],
  inference_endpoint: [
    ['the endpoints of the task', scope({ taskType: 'rerank' }), ['rerank_1']],
    ['nothing without a task', scope(), []],
  ],
  metadata_field: [
    ['the fields the language defines', scope(), [...METADATA_FIELD_NAMES]],
    [
      'the project fields on serverless',
      scope({ isServerless: true }),
      [...METADATA_FIELD_NAMES, ...SERVERLESS_METADATA_FIELD_NAMES],
    ],
  ],
  setting: [],
};

describe('the entity registry', () => {
  describe.each(ENTITY_TYPES.filter((type) => CONTRACT[type].length))('%s', (type) => {
    it.each(CONTRACT[type])('lists %s', async (_name, entityScope, expected) => {
      expect(names(await ENTITIES[type].fetch(callbacks, entityScope))).toEqual(expected);
    });
  });

  it('lists nothing, without failing, when the editor provides nothing', async () => {
    for (const type of ENTITY_TYPES.filter(
      (kind) => kind !== 'metadata_field' && kind !== 'setting'
    )) {
      expect(
        await ENTITIES[type].fetch({}, scope({ parent: 'policy', taskType: 'rerank' }))
      ).toEqual([]);
    }
  });

  it('carries what the editor says about a source', async () => {
    const sources = await ENTITIES.source.fetch(callbacks, scope());

    expect(sources).toEqual(
      expect.arrayContaining([
        {
          name: '.internal',
          hidden: true,
          category: 'Index',
          description: undefined,
          hasChildren: false,
        },
        {
          name: 'nginx',
          hidden: false,
          category: 'Integration',
          description: undefined,
          hasChildren: true,
        },
        { name: 'my_view', category: 'View', description: undefined },
      ])
    );
  });

  it('carries the aliases of an index, which name it too', async () => {
    const [lookup] = await ENTITIES.lookup_index.fetch(callbacks, scope());

    expect(lookup.aliases).toEqual(['lookup_alias']);
    expect(ENTITIES.lookup_index.exists?.('lookup_alias', [lookup])).toBe(true);
    expect(ENTITIES.lookup_index.exists?.('other', [lookup])).toBe(false);
  });

  describe('settings', () => {
    it('lists the serverless-only settings only on serverless', async () => {
      const stateful = names(await ENTITIES.setting.fetch({}, scope()));
      const serverless = names(await ENTITIES.setting.fetch({}, scope({ isServerless: true })));

      expect(stateful.length).toBeGreaterThan(0);
      expect(serverless.length).toBeGreaterThan(stateful.length);
      expect(serverless).toEqual(expect.arrayContaining(stateful));
    });
  });

  // The language data is kept in the definitions package; until the current flow goes, its
  // own copy has to say the same.
  it('has the metadata fields of the current flow', () => {
    expect([...METADATA_FIELD_NAMES]).toEqual(METADATA_FIELDS);
    expect([...SERVERLESS_METADATA_FIELD_NAMES]).toEqual(CPS_METADATA_FIELDS);
  });
});
