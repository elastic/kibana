/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { filterQuery } from './filter_query';
import { timerange } from './timerange';

export const requestBasicOptionsSchema = z.object({
  timerange: timerange.optional(),
  filterQuery,
  defaultIndex: z.array(z.string()).optional(),
  id: z.string().optional(),
  params: z.any().optional(),
});

export type RequestBasicOptionsInput = z.input<typeof requestBasicOptionsSchema>;

export type RequestBasicOptions = z.infer<typeof requestBasicOptionsSchema>;
