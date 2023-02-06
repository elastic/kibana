/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { buildDataViewMock } from './data_view';

const fields = [
  {
    name: '_index',
    displayName: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
  },
  {
    name: 'timestamp',
    displayName: 'timestamp',
    type: 'date',
    scripted: false,
    filterable: true,
    aggregatable: true,
    sortable: true,
  },
  {
    name: 'message',
    displayName: 'message',
    type: 'string',
    scripted: false,
    filterable: false,
  },
  {
    name: 'extension',
    displayName: 'extension',
    type: 'string',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'scripted',
    displayName: 'scripted',
    type: 'number',
    scripted: true,
    filterable: false,
  },
] as DataView['fields'];

export const dataViewWithTimefieldMock = buildDataViewMock({
  name: 'index-pattern-with-timefield',
  fields,
  timeFieldName: 'timestamp',
});
