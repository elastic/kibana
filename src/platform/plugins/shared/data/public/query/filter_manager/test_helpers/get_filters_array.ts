/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';

export function getFiltersArray(): Filter[] {
  return [
    {
      query: { match: { extension: { query: 'jpg' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    },
    {
      query: { match: { '@tags': { query: 'info' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    },
    {
      query: { match: { _type: { query: 'nginx' } } },
      meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
    },
  ];
}
