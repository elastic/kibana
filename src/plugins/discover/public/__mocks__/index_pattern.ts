/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  id: 'the-index-pattern-id',
  title: 'the-index-pattern-title',
  metaFields: ['_index', '_score'],
  flattenHit: undefined,
  formatHit: jest.fn((hit) => hit._source),
  fields,
  getComputedFields: () => ({}),
  getSourceFiltering: () => ({}),
  getFieldByName: () => ({}),
  timeFieldName: '',
} as unknown) as IndexPattern;

indexPattern.flattenHit = indexPatterns.flattenHitWrapper(indexPattern, indexPattern.metaFields);
indexPattern.isTimeBased = () => !!indexPattern.timeFieldName;

export const indexPatternMock = indexPattern;
