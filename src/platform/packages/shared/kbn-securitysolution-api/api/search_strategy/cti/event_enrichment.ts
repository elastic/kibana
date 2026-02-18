/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { CtiQueries } from '../model/factory_query_type';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { timerange } from '../model/timerange';

export const eventEnrichmentRequestOptionsSchema = requestBasicOptionsSchema.extend({
  eventFields: z.record(z.unknown()),
  timerange,
  factoryQueryType: z.literal(CtiQueries.eventEnrichment),
});

export type EventEnrichmentRequestOptionsInput = z.input<
  typeof eventEnrichmentRequestOptionsSchema
>;

export type EventEnrichmentRequestOptions = z.infer<typeof eventEnrichmentRequestOptionsSchema>;
