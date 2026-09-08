/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type {
  asCodeFilterSchema,
  asCodeConditionFilterSchema,
  asCodeGroupFilterSchema,
  asCodeDSLFilterSchema,
  asCodeSpatialFilterSchema,
} from './schemas/filter';

/**
 * Schema-inferred types for As Code Filter API
 *
 * These types are inferred from validation schemas and provide runtime validation compatibility.
 */
export type AsCodeFilter = z.output<typeof asCodeFilterSchema>;
export type AsCodeConditionFilter = z.output<typeof asCodeConditionFilterSchema>;
export type AsCodeGroupFilter = z.output<typeof asCodeGroupFilterSchema>;
export type AsCodeDSLFilter = z.output<typeof asCodeDSLFilterSchema>;
export type AsCodeSpatialFilter = z.output<typeof asCodeSpatialFilterSchema>;
