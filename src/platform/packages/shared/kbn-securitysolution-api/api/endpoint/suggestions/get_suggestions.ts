/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const EndpointSuggestionsSchema = {
  body: schema.object({
    field: schema.string(),
    query: schema.string(),
    filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    fieldMeta: schema.maybe(schema.any()),
  }),
  params: schema.object({
    suggestion_type: schema.oneOf([
      schema.literal('eventFilters'),
      schema.literal('endpoints'),
      schema.literal('endpointExceptions'),
      schema.literal('trustedApps'),
      schema.literal('trustedDevices'),
    ]),
  }),
};

export type EndpointSuggestionsBody = TypeOf<typeof EndpointSuggestionsSchema.body>;
export type EndpointSuggestionsParams = TypeOf<typeof EndpointSuggestionsSchema.params>;
