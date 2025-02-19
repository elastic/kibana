/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const trackingContainmentRuleParamsSchema = schema.object({
  index: schema.string({ minLength: 1 }),
  indexId: schema.string({ minLength: 1 }),
  geoField: schema.string({ minLength: 1 }),
  entity: schema.string({ minLength: 1 }),
  dateField: schema.string({ minLength: 1 }),
  boundaryType: schema.string({ minLength: 1 }),
  boundaryIndexTitle: schema.string({ minLength: 1 }),
  boundaryIndexId: schema.string({ minLength: 1 }),
  boundaryGeoField: schema.string({ minLength: 1 }),
  boundaryNameField: schema.maybe(schema.string({ minLength: 1 })),
  indexQuery: schema.maybe(schema.any({})),
  boundaryIndexQuery: schema.maybe(schema.any({})),
});

export type TrackingContainmentRuleParams = TypeOf<typeof trackingContainmentRuleParamsSchema>;
