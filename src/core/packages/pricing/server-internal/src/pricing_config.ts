/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { pricingProductsSchema } from '@kbn/core-pricing-common';

export const pricingConfig = {
  path: 'pricing',
  schema: schema.object({
    tiers: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      products: schema.maybe(schema.arrayOf(pricingProductsSchema)),
    }),
  }),
};

export type PricingConfigType = TypeOf<typeof pricingConfig.schema>;
