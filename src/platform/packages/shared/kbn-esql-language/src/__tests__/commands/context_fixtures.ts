/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IndexAutocompleteItem, InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import type {
  ESQLColumnData,
  ESQLPolicy,
  ICommandCallbacks,
  ICommandContext,
} from '../../commands/registry/types';
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
  columns: new Map<string, ESQLColumnData>([
    [
      'var0',
      {
        name: 'var0',
        type: 'double',
        location: { min: 0, max: 10 },
        userDefined: true,
      },
    ],
    [
      'col0',
      {
        name: 'col0',
        type: 'double',
        location: { min: 0, max: 10 },
        userDefined: true,
      },
    ],
    [
      'prompt',
      {
        name: 'prompt',
        type: 'keyword',
        location: { min: 0, max: 10 },
        userDefined: true,
      },
    ],
    [
      'integerPrompt',
      {
        name: 'integerPrompt',
        type: 'integer',
        location: { min: 0, max: 10 },
        userDefined: true,
      },
    ],
    [
      'ipPrompt',
      {
        name: 'ipPrompt',
        type: 'ip',
        location: { min: 0, max: 10 },
        userDefined: true,
      },
    ],
    [
      'renamedField',
      {
        name: 'renamedField',
        type: 'keyword',
        location: { min: 0, max: 10 },
        userDefined: true,
      },
    ],
    ['keywordField', { name: 'keywordField', type: 'keyword', userDefined: false }],
    ['any#Char$Field', { name: 'any#Char$Field', type: 'keyword', userDefined: false }],
    ['textField', { name: 'textField', type: 'text', userDefined: false }],
    ['doubleField', { name: 'doubleField', type: 'double', userDefined: false }],
    ['integerField', { name: 'integerField', type: 'integer', userDefined: false }],
    [
      'counterIntegerField',
      { name: 'counterIntegerField', type: 'counter_integer', userDefined: false },
    ],
    ['dateField', { name: 'dateField', type: 'date', userDefined: false }],
    ['dateNanosField', { name: 'dateNanosField', type: 'date_nanos', userDefined: false }],
    ['@timestamp', { name: '@timestamp', type: 'date', userDefined: false }],
    ['ipField', { name: 'ipField', type: 'ip', userDefined: false }],
    ['booleanField', { name: 'booleanField', type: 'boolean', userDefined: false }],
    ['geoPointField', { name: 'geoPointField', type: 'geo_point', userDefined: false }],
    ['geoShapeField', { name: 'geoShapeField', type: 'geo_shape', userDefined: false }],
    ['versionField', { name: 'versionField', type: 'version', userDefined: false }],
    ['longField', { name: 'longField', type: 'long', userDefined: false }],
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
  activeProduct: {
    type: 'observability',
    tier: 'complete',
  },
};

export type MockedICommandCallbacks = {
  [key in keyof ICommandCallbacks]: jest.Mocked<ICommandCallbacks[key]>;
};

export const getMockCallbacks = (): MockedICommandCallbacks => {
  const expectedFields = getFieldNamesByType('any');
  return {
    getByType: jest.fn().mockImplementation(async (types, ignoredColumns = []) => {
      return (
        expectedFields
          // Exclude columns already used (e.g., used in STATS BY or parent function scope)
          .filter((name) => !ignoredColumns.includes(name))
          .map((name) => ({ label: name, text: name }))
      );
    }),
    getSuggestedUserDefinedColumnName: jest.fn(),
    getColumnsForQuery: jest.fn(),
    hasMinimumLicenseRequired: jest.fn().mockReturnValue(true),
    canCreateLookupIndex: jest.fn().mockReturnValue(true),
    isServerless: false,
  };
};
