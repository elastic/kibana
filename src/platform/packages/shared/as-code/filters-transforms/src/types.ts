/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';

/**
 * Local type definition for stored filters
 */
export type StoredFilter = Omit<Filter, 'meta'> & {
  meta: Omit<Filter['meta'], 'params' | 'value'> & {
    field?: string;
    relation?: string;
    indexRefName?: string;
    params?: any;
    value?: any;
  };
};
