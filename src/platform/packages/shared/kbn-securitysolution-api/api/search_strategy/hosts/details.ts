/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { HostsQueries } from '../model/factory_query_type';
import { inspect } from '../model/inspect';
import { pagination } from '../model/pagination';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { timerange } from '../model/timerange';
import { sort } from './model/sort';

export const hostDetailsSchema = requestBasicOptionsSchema.extend({
  hostName: z.string(),
  skip: z.boolean().optional(),
  inspect,
  pagination: pagination.optional(),
  timerange,
  sort,
  factoryQueryType: z.literal(HostsQueries.details),
});

export type HostDetailsRequestOptionsInput = z.input<typeof hostDetailsSchema>;

export type HostDetailsRequestOptions = z.infer<typeof hostDetailsSchema>;
