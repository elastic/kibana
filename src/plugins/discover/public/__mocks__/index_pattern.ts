/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IIndexPatternFieldList } from '../../../data/common';
import { IndexPattern } from '../../../data/common';

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
    displayName: 'message',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: 'extension',
    type: 'string',
    displayName: 'extension',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    displayName: 'bytesDisplayName',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    displayName: 'scripted',
    scripted: true,
    filterable: false,
  },
  {
    name: 'object.value',
    type: 'number',
    displayName: 'object.value',
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
  fields,
  getComputedFields: () => ({ docvalueFields: [], scriptFields: {}, storedFields: ['*'] }),
  getSourceFiltering: () => ({}),
  getFieldByName: jest.fn(() => ({})),
  timeFieldName: '',
  docvalueFields: [],
  getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
} as unknown as IndexPattern;

indexPattern.isTimeBased = () => !!indexPattern.timeFieldName;

export const indexPatternMock = indexPattern;
