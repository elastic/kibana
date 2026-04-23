/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldList } from '@kbn/data-views-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/public';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';

const fields: FieldSpec[] = [
  {
    name: '_index',
    type: 'string',
    scripted: false,
    searchable: true,
    aggregatable: false,
  },
  {
    name: 'timestamp',
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
  {
    name: 'extension',
    type: 'string',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    scripted: true,
    searchable: false,
    aggregatable: false,
  },
];

export const dataViewWithTimefieldMock = buildDataViewMock({
  name: 'index-pattern-with-timefield',
  fields: fieldList(fields),
  timeFieldName: 'timestamp',
});
