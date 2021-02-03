/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IIndexPatternFieldList } from '../../../data/common/index_patterns/fields';
import { IndexPattern } from '../../../data/common';
import { indexPatterns } from '../../../data/public';

const fields = [
  {
    name: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
  },
  {
    name: 'timestamp',
    type: 'date',
    scripted: false,
    filterable: true,
  },
  {
    name: 'message',
    type: 'string',
    scripted: false,
    filterable: false,
  },
  {
    name: 'extension',
    type: 'string',
    scripted: false,
    filterable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    scripted: false,
    filterable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    scripted: true,
    filterable: false,
  },
] as IIndexPatternFieldList;

fields.getByName = (name: string) => {
  return fields.find((field) => field.name === name);
};

const indexPattern = ({
  id: 'index-pattern-with-timefield-id',
  title: 'index-pattern-without-timefield',
  metaFields: ['_index', '_score'],
  flattenHit: undefined,
  formatHit: jest.fn((hit) => hit._source),
  fields,
  getComputedFields: () => ({}),
  getSourceFiltering: () => ({}),
  getFieldByName: () => ({}),
  timeFieldName: 'timestamp',
} as unknown) as IndexPattern;

indexPattern.flattenHit = indexPatterns.flattenHitWrapper(indexPattern, indexPattern.metaFields);
indexPattern.isTimeBased = () => !!indexPattern.timeFieldName;

export const indexPatternWithTimefieldMock = indexPattern;
