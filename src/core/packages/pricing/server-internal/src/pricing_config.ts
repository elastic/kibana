/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { tiersConfigSchema } from '@kbn/core-pricing-common/src/pricing_tiers_config';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const configSchema = schema.object({
  tiers: tiersConfigSchema,
});

export const pricingConfig: ServiceConfigDescriptor<PricingConfigType> = {
  path: 'pricing',
  schema: configSchema,
};

export type PricingConfigType = TypeOf<typeof configSchema>;
