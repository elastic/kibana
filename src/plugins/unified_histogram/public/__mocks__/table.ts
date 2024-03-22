/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';

export const tableQueryMock = {
  esql: 'from logstash | stats avg(bytes) by extension.keyword',
};

export const tableMock = {
  type: 'datatable',
  rows: [
    {
      'avg(bytes)': 3850,
      'extension.keyword': '',
    },
    {
      'avg(bytes)': 5393.5,
      'extension.keyword': 'css',
    },
    {
      'avg(bytes)': 3252,
      'extension.keyword': 'deb',
    },
  ],
  columns: [
    {
      id: 'avg(bytes)',
      name: 'avg(bytes)',
      meta: {
        type: 'number',
      },
      isNull: false,
    },
    {
      id: 'extension.keyword',
      name: 'extension.keyword',
      meta: {
        type: 'string',
      },
      isNull: false,
    },
  ],
} as Datatable;
