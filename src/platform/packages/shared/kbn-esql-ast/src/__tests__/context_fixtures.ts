/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { IndexAutocompleteItem, InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import type {
  ESQLFieldWithMetadata,
  ESQLPolicy,
  ESQLUserDefinedColumn,
  ICommandCallbacks,
  ICommandContext,
} from '../commands_registry/types';
import { getFieldNamesByType } from './autocomplete';

export const joinIndices: IndexAutocompleteItem[] = [
  {
    name: 'join_index',
    mode: 'lookup',
    aliases: [],
  },
  {
    name: 'join_index_with_alias',
    mode: 'lookup',
    aliases: ['join_index_alias_1', 'join_index_alias_2'],
  },
  {
    name: 'lookup_index',
    mode: 'lookup',
    aliases: [],
  },
];

export const lookupIndexFields = [
  { name: 'booleanField', type: 'boolean' },
  { name: 'dateField', type: 'date' },
  { name: 'joinIndexOnlyField', type: 'text' },
];

export const timeseriesIndices: IndexAutocompleteItem[] = [
  {
    name: 'timeseries_index',
    mode: 'time_series',
    aliases: [],
  },
  {
    name: 'timeseries_index_with_alias',
    mode: 'time_series',
    aliases: ['timeseries_index_alias_1', 'timeseries_index_alias_2'],
  },
  {
    name: 'time_series_index',
    mode: 'time_series',
    aliases: [],
  },
];

export const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrich_index'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
  {
    name: 'policy$',
    sourceIndices: ['enrich_index'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
];

export const indexes = [
  'a_index',
  'index',
  'other_index',
  '.secret_index',
  'my-index',
  'unsupported_index',
];

export const integrations = ['nginx', 'k8s'];

const inferenceEndpoints: InferenceEndpointAutocompleteItem[] = [
  {
    inference_id: 'inference_1',
    task_type: 'completion',
  },
];

export const editorExtensions = {
  recommendedQueries: [
    {
      name: 'Logs Count by Host',
      query: 'from logs* | STATS count(*) by host',
    },
  ],
  recommendedFields: [
    {
      name: 'host.name',
      pattern: 'logs*',
    },
    {
      name: 'user.name',
      pattern: 'logs*',
    },
    {
      name: 'kubernetes.something.something',
      pattern: 'logs*',
    },
  ],
};

export const mockContext: ICommandContext = {
  userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([
    [
      'var0',
      [
        {
          name: 'var0',
          type: 'double',
          location: { min: 0, max: 10 },
        },
      ],
    ],
    [
      'col0',
      [
        {
          name: 'col0',
          type: 'double',
          location: { min: 0, max: 10 },
        },
      ],
    ],
    [
      'prompt',
      [
        {
          name: 'prompt',
          type: 'keyword',
          location: { min: 0, max: 10 },
        },
      ],
    ],
    [
      'integerPrompt',
      [
        {
          name: 'integerPrompt',
          type: 'integer',
          location: { min: 0, max: 10 },
        },
      ],
    ],
    [
      'ipPrompt',
      [
        {
          name: 'ipPrompt',
          type: 'ip',
          location: { min: 0, max: 10 },
        },
      ],
    ],
    [
      'renamedField',
      [
        {
          name: 'renamedField',
          type: 'keyword',
          location: { min: 0, max: 10 },
        },
      ],
    ],
  ]),
  fields: new Map<string, ESQLFieldWithMetadata>([
    ['keywordField', { name: 'keywordField', type: 'keyword' }],
    ['any#Char$Field', { name: 'any#Char$Field', type: 'keyword' }],
    ['textField', { name: 'textField', type: 'text' }],
    ['doubleField', { name: 'doubleField', type: 'double' }],
    ['integerField', { name: 'integerField', type: 'integer' }],
    ['counterIntegerField', { name: 'counterIntegerField', type: 'counter_integer' }],
    ['dateField', { name: 'dateField', type: 'date' }],
    ['dateNanosField', { name: 'dateNanosField', type: 'date_nanos' }],
    ['@timestamp', { name: '@timestamp', type: 'date' }],
    ['ipField', { name: 'ipField', type: 'ip' }],
    ['booleanField', { name: 'booleanField', type: 'boolean' }],
    ['geoPointField', { name: 'geoPointField', type: 'geo_point' }],
    ['geoShapeField', { name: 'geoShapeField', type: 'geo_shape' }],
    ['versionField', { name: 'versionField', type: 'version' }],
    ['longField', { name: 'longField', type: 'long' }],
  ]),
  policies: new Map<string, ESQLPolicy>(policies.map((policy) => [policy.name, policy])),
  sources: indexes.map((name) => ({
    name,
    hidden: name.startsWith('.'),
    type: 'Index',
  })),
  joinSources: joinIndices,
  timeSeriesSources: timeseriesIndices,
  inferenceEndpoints,
  histogramBarTarget: 50,
};

export const getMockCallbacks = (): ICommandCallbacks => {
  const expectedFields = getFieldNamesByType('any');
  return {
    getByType: jest
      .fn()
      .mockResolvedValue(expectedFields.map((name) => ({ label: name, text: name }))),
    getSuggestedUserDefinedColumnName: jest.fn(),
    getColumnsForQuery: jest.fn(),
  };
};
