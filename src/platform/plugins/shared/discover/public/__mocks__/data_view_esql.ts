/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldList, type FieldSpec } from '@kbn/data-views-plugin/common';

const fields: FieldSpec[] = [
  {
    name: '@timestamp',
    customLabel: 'timestamp',
    type: 'date',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'message',
    type: 'string',
    scripted: false,
    searchable: false,
    aggregatable: false,
  },
];

export const dataViewEsql = buildDataViewMock({
  name: 'index-pattern-esql',
  title: 'index-pattern-esql',
  fields: fieldList(fields),
  isPersisted: false,
});
