/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';

/**
 * Parent filter that scopes options-list aggregations to the current space, matching the executions list.
 */
export const buildSpaceFilter = (spaceId: string): Filter => ({
  meta: {
    type: FILTERS.CUSTOM,
    disabled: false,
    negate: false,
    alias: null,
  },
  query: {
    bool: {
      should: [{ term: { spaceId } }, { bool: { must_not: { exists: { field: 'spaceId' } } } }],
      minimum_should_match: 1,
    },
  },
});
