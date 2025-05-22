/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const pricingProductsSchema = schema.oneOf([
  schema.object({
    name: schema.literal('observability'),
    tier: schema.oneOf([schema.literal('complete'), schema.literal('essentials')]),
  }),
  schema.object({
    name: schema.literal('security'),
    tier: schema.oneOf([schema.literal('complete'), schema.literal('essentials')]),
  }),
  schema.object({
    name: schema.literal('endpoint'),
    tier: schema.oneOf([schema.literal('complete'), schema.literal('essentials')]),
  }),
  schema.object({
    name: schema.literal('cloud'),
    tier: schema.oneOf([schema.literal('complete'), schema.literal('essentials')]),
  }),
]);

export type PricingProduct = TypeOf<typeof pricingProductsSchema>;
