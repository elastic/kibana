/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import type { IndexAutocompleteItem } from '@kbn/esql-types';
import { ESQLFieldWithMetadata } from '../validation/types';
import { fieldTypes } from '../definitions/types';
import { ESQLCallbacks } from '../shared/types';
import { METADATA_FIELDS } from '../shared/constants';

export const metadataFields: ESQLFieldWithMetadata[] = METADATA_FIELDS.map((field) => ({
  name: field,
  type: 'keyword',
}));

export const fields: ESQLFieldWithMetadata[] = [
  ...fieldTypes.map((type) => ({ name: `${camelCase(type)}Field`, type })),
  { name: 'any#Char$Field', type: 'double' },
  { name: 'kubernetes.something.something', type: 'double' },
  { name: '@timestamp', type: 'date' },
];

export const enrichFields: ESQLFieldWithMetadata[] = [
  { name: 'otherField', type: 'text' },
  { name: 'yetAnotherField', type: 'double' },
];

// eslint-disable-next-line @typescript-eslint/naming-convention
export const unsupported_field: ESQLFieldWithMetadata[] = [
  { name: 'unsupported_field', type: 'unsupported' },
];

export const indexes = [
  'a_index',
  'index',
  'other_index',
  '.secret_index',
  'my-index',
  'unsupported_index',
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

export const editorExtensions = [
  {
    name: 'Logs Count by Host',
    query: 'from logs* | STATS count(*) by host',
  },
];

export function getCallbackMocks(): ESQLCallbacks {
  return {
    getColumnsFor: jest.fn(async ({ query } = {}) => {
      if (/enrich/.test(query)) {
        return enrichFields;
      }
      if (/unsupported_index/.test(query)) {
        return unsupported_field;
      }
      if (/join_index/.test(query)) {
        const field: ESQLFieldWithMetadata = {
          name: 'keywordField',
          type: 'unsupported',
          hasConflict: true,
        };
        return [field];
      }
      if (/METADATA/i.test(query)) {
        return [...fields, ...metadataFields];
      }
      return fields;
    }),
    getSources: jest.fn(async () =>
      indexes.map((name) => ({
        name,
        hidden: name.startsWith('.'),
        type: 'Index',
      }))
    ),
    getPolicies: jest.fn(async () => policies),
    getJoinIndices: jest.fn(async () => ({ indices: joinIndices })),
    getTimeseriesIndices: jest.fn(async () => ({ indices: timeseriesIndices })),
    getEditorExtensions: jest.fn(async (queryString: string) => {
      if (queryString.includes('logs*')) {
        return editorExtensions;
      }
      return [];
    }),
  };
}
