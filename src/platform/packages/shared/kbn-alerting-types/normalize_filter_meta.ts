/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';

// `meta.value` is a display cache derived from `meta.params` and is regenerated on every
// render. For "is one of" (array) and range (object) filters it is not a string, which the
// rule saved object does not persist. Drop the non-string value so the stored filter keeps
// the canonical shape (the values stay in `meta.params` and the query in `query`).
export const normalizePersistedFilterMeta = (meta: Filter['meta']): Filter['meta'] => {
  if (meta.value === undefined || typeof meta.value === 'string') {
    return meta;
  }
  const { value, ...rest } = meta;
  return rest;
};
