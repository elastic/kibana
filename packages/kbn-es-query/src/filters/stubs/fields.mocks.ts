/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewFieldBase } from '../..';

/**
 * Base index pattern fields for testing
 */
export const fields: DataViewFieldBase[] = [
  {
    name: 'bytes',
    type: 'number',
    scripted: false,
  },
  {
    name: 'ssl',
    type: 'boolean',
    scripted: false,
  },
  {
    name: '@timestamp',
    type: 'date',
    scripted: false,
  },
  {
    name: 'extension',
    type: 'string',
    scripted: false,
  },
  {
    name: 'machine.os',
    type: 'string',
    scripted: false,
  },
  {
    name: 'machine.os.raw',
    type: 'string',
    scripted: false,
  },
  {
    name: 'script number',
    type: 'number',
    scripted: true,
    script: '1234',
    lang: 'expression',
  },
  {
    name: 'script date',
    type: 'date',
    scripted: true,
    script: '1234',
    lang: 'painless',
  },
  {
    name: 'script string',
    type: 'string',
    scripted: true,
    script: '1234',
    lang: 'painless',
  },
  {
    name: 'nestedField.child',
    type: 'string',
    scripted: false,
    subType: { nested: { path: 'nestedField' } },
  },
  {
    name: 'nestedField.nestedChild.doublyNestedChild',
    type: 'string',
    scripted: false,
    subType: { nested: { path: 'nestedField.nestedChild' } },
  },
];

export const getField = (name: string) => fields.find((field) => field.name === name);
