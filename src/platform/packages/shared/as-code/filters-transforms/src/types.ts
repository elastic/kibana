/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type { storedFilterSchema } from '@kbn/es-query-server';

/**
 * Local type definition for stored filters
 * Inferred from the storedFilterSchema in @kbn/es-query-server
 */
export type StoredFilter = Writable<TypeOf<typeof storedFilterSchema>>;
