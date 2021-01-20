/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter } from '../../../../common';

export function getFiltersArray(): Filter[] {
  return [
    {
      query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    },
    {
      query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    },
    {
      query: { match: { _type: { query: 'nginx', type: 'phrase' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    },
  ];
}
