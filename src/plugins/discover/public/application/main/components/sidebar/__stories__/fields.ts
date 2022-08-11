/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField, FieldSpec } from '@kbn/data-views-plugin/public';

export const fieldSpecMap: Record<string, FieldSpec> = {
  'machine.os': {
    name: 'machine.os',
    esTypes: ['text'],
    type: 'string',
    aggregatable: false,
    searchable: false,
  },
  'machine.os.raw': {
    name: 'machine.os.raw',
    type: 'string',
    esTypes: ['keyword'],
    aggregatable: true,
    searchable: true,
  },
  'not.filterable': {
    name: 'not.filterable',
    type: 'string',
    esTypes: ['text'],
    aggregatable: true,
    searchable: false,
  },
  bytes: {
    name: 'bytes',
    type: 'number',
    esTypes: ['long'],
    aggregatable: true,
    searchable: true,
  },
};

export const numericField = new DataViewField({
  name: 'bytes',
  type: 'number',
  esTypes: ['long'],
  count: 10,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
});
