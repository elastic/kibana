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

export const threatIntelSourceRequestOptionsSchema = requestBasicOptionsSchema.extend({
  factoryQueryType: z.literal(CtiQueries.dataSource),
});

export type ThreatIntelSourceRequestOptionsInput = z.input<
  typeof threatIntelSourceRequestOptionsSchema
>;

export type ThreatIntelSourceRequestOptions = z.infer<typeof threatIntelSourceRequestOptionsSchema>;
