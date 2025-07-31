/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, offeringBasedSchema, schema } from '@kbn/config-schema';

/**
 * Schema defining the valid pricing product configurations.
 * Each product has a name and an associated tier that determines feature availability.
 *
 * @internal
 */
export const pricingProductsSchema = schema.oneOf([
  schema.object({
    name: schema.literal('observability'),
    tier: schema.oneOf([schema.literal('complete'), schema.literal('logs_essentials')]),
  }),
  schema.object({
    name: schema.literal('ai_soc'),
    tier: schema.literal('search_ai_lake'),
  }),
  schema.object({
    name: schema.literal('security'),
    tier: schema.oneOf([
      schema.literal('complete'),
      schema.literal('essentials'),
      schema.literal('search_ai_lake'),
    ]),
  }),
  schema.object({
    name: schema.literal('endpoint'),
    tier: schema.oneOf([
      schema.literal('complete'),
      schema.literal('essentials'),
      schema.literal('search_ai_lake'),
    ]),
  }),
  schema.object({
    name: schema.literal('cloud'),
    tier: schema.oneOf([
      schema.literal('complete'),
      schema.literal('essentials'),
      schema.literal('search_ai_lake'),
    ]),
  }),
]);

/**
 * Represents a product with an associated pricing tier.
 * Used to determine feature availability based on the current pricing configuration.
 *
 * @public
 */
export type IPricingProduct = TypeOf<typeof pricingProductsSchema>;

/**
 * Schema defining the pricing tiers configuration structure.
 * Includes whether tiers are enabled and which products are active.
 *
 * @internal
 */
export const tiersConfigSchema = schema.object({
  enabled: offeringBasedSchema({
    serverless: schema.boolean({ defaultValue: false }),
    traditional: schema.literal(false),
    options: { defaultValue: false },
  }),
  products: schema.maybe(
    schema.arrayOf(pricingProductsSchema, {
      validate: (products) => {
        if (products && products.length > 1) {
          const firstTier = products[0].tier;
          const allSameTier = products.every((product) => product.tier === firstTier);
          if (!allSameTier) {
            return `Invalid pricing configuration: All products must have the same tier. Found tiers: ${products
              .map((p) => `${p.name}:${p.tier}`)
              .join(', ')}`;
          }

          // Check for mixed product types (observability vs security-related)
          const hasObservability = products.some((p) => p.name === 'observability');
          const hasSecurityProducts = products.some((p) =>
            ['ai_soc', 'endpoint', 'cloud', 'security'].includes(p.name)
          );

          if (hasObservability && hasSecurityProducts) {
            return 'Cannot mix observability and security products in the same configuration';
          }
        }
      },
    })
  ),
});

/**
 * Configuration for pricing tiers that determines feature availability.
 * When enabled, features are only available if they're associated with an active product.
 * When disabled, all features are considered available.
 *
 * @public
 */
export type TiersConfig = TypeOf<typeof tiersConfigSchema>;
