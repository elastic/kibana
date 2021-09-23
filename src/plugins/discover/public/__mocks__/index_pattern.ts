/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IIndexPatternFieldList } from '../../../data/common';
import { IndexPattern } from '../../../data/common';
import { indexPatterns } from '../../../data/public';

const fields = [
  {
    name: '_source',
    type: '_source',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
    aggregatable: false,
  },
  {
    name: 'message',
    type: 'string',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: 'extension',
    type: 'string',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    scripted: true,
    filterable: false,
  },
  {
    name: 'object.value',
    type: 'number',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
] as IIndexPatternFieldList;

fields.getByName = (name: string) => {
  return fields.find((field) => field.name === name);
};

fields.getAll = () => {
  return fields;
};

const indexPattern = {
  id: 'the-index-pattern-id',
  title: 'the-index-pattern-title',
  metaFields: ['_index', '_score'],
  formatField: jest.fn(),
  flattenHit: undefined,
  formatHit: jest.fn((hit) => (hit.fields ? hit.fields : hit._source)),
  fields,
  getComputedFields: () => ({ docvalueFields: [], scriptFields: {}, storedFields: ['*'] }),
  getSourceFiltering: () => ({}),
  getFieldByName: jest.fn(() => ({})),
  timeFieldName: '',
  docvalueFields: [],
  getFormatterForField: () => ({ convert: () => 'formatted' }),
} as unknown as IndexPattern;

indexPattern.flattenHit = indexPatterns.flattenHitWrapper(indexPattern, indexPattern.metaFields);
indexPattern.isTimeBased = () => !!indexPattern.timeFieldName;
indexPattern.formatField = (hit: Record<string, unknown>, fieldName: string) => {
  return fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
};

export const indexPatternMock = indexPattern;
