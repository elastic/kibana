/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { RelatedEntitiesQueries } from '../model/factory_query_type';
import { inspect } from '../model/inspect';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const relatedHostsRequestOptionsSchema = requestBasicOptionsSchema.extend({
  userName: z.string(),
  skip: z.boolean().optional(),
  from: z.string(),
  inspect,
  factoryQueryType: z.literal(RelatedEntitiesQueries.relatedHosts),
});

export type RelatedHostsRequestOptionsInput = z.input<typeof relatedHostsRequestOptionsSchema>;

export type RelatedHostsRequestOptions = z.infer<typeof relatedHostsRequestOptionsSchema>;
