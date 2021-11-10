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
    aggregatable: true,
    sortable: true,
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
] as IIndexPatternFieldList;

fields.getByName = (name: string) => {
  return fields.find((field) => field.name === name);
};
fields.getAll = () => {
  return fields;
};

const indexPattern = {
  id: 'index-pattern-with-timefield-id',
  title: 'index-pattern-with-timefield',
  metaFields: ['_index', '_score'],
  fields,
  getComputedFields: () => ({}),
  getSourceFiltering: () => ({}),
  getFieldByName: (name: string) => fields.getByName(name),
  timeFieldName: 'timestamp',
  getFormatterForField: () => ({ convert: (value: unknown) => value }),
  isTimeNanosBased: () => false,
  popularizeField: () => {},
} as unknown as IndexPattern;

indexPattern.isTimeBased = () => !!indexPattern.timeFieldName;

export const indexPatternWithTimefieldMock = indexPattern;
