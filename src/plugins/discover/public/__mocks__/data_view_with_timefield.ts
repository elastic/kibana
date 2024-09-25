/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldList } from '@kbn/data-views-plugin/common';
import { FieldSpec } from '@kbn/data-views-plugin/public';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';

const fields = [
  {
    name: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
    searchable: true,
  },
  {
    name: 'timestamp',
    displayName: 'timestamp',
    type: 'date',
    scripted: false,
    filterable: true,
    aggregatable: true,
    sortable: true,
    searchable: true,
  },
  {
    name: 'message',
    displayName: 'message',
    type: 'string',
    scripted: false,
    filterable: false,
    searchable: true,
  },
  {
    name: 'extension',
    displayName: 'extension',
    type: 'string',
    scripted: false,
    filterable: true,
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    scripted: false,
    filterable: true,
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'scripted',
    displayName: 'scripted',
    type: 'number',
    scripted: true,
    filterable: false,
  },
];

export const dataViewWithTimefieldMock = buildDataViewMock({
  name: 'index-pattern-with-timefield',
  fields: fieldList(fields as unknown as FieldSpec[]),
  timeFieldName: 'timestamp',
});
