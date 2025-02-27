/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataView } from '@kbn/data-views-plugin/common';

const fields = [
  {
    name: '@timestamp',
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
] as DataView['fields'];

export const dataViewEsql = buildDataViewMock({
  name: 'index-pattern-esql',
  fields,
});
