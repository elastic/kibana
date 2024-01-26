/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterStateStore, RangeFilter } from '@kbn/es-query';

export const rangeFilter: RangeFilter = {
  meta: {
    index: 'logstash-*',
    negate: false,
    disabled: false,
    alias: null,
    type: 'range',
    key: 'bytes',
    value: '0 to 10',
    params: {
      gte: 0,
      lt: 10,
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  query: { range: { bytes: { gt: 0, lt: 10 } } },
};
