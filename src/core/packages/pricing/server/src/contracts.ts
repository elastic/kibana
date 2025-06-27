/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IPricingTiersClient, PricingProductFeature } from '@kbn/core-pricing-common';

/**
 * APIs to manage pricing product features during the setup phase.
 *
 * Plugins that want to register features that are available in specific pricing tiers
 * should use the `registerProductFeatures` method during the setup phase.
 *
 * @public
 */
export interface PricingServiceSetup {
  /**
   * Check if a specific feature is available in the current pricing tier configuration.
   * Resolves asynchronously after the pricing service has been set up and all the plugins have registered their features.
   *
   * @example
   * ```ts
   * // my-plugin/server/plugin.ts
   * public setup(core: CoreSetup) {
   *   const isPremiumFeatureAvailable = core.pricing.isFeatureAvailable('my_premium_feature');
   * }
   * ```
   */
  isFeatureAvailable(featureId: string): Promise<boolean>;
  /**
   * Register product features that are available in specific pricing tiers.
   *
   * @example
   * ```ts
   * // my-plugin/server/plugin.ts
   * public setup(core: CoreSetup) {
   *   core.pricing.registerProductFeatures([
   *     {
   *       id: 'my_premium_feature',
   *       description: 'A premium feature only available in specific tiers',
   *       products: [{ name: 'security', tier: 'complete' }]
   *     }
   *   ]);
   * }
   * ```
   */
  registerProductFeatures(features: PricingProductFeature[]): void;
}

/**
 * APIs to access pricing tier information during the start phase.
 *
 * @public
 */
export interface PricingServiceStart {
  /**
   * Check if a specific feature is available based on the current pricing tier configuration.
   * Delegates to the underlying {@link IPricingTiersClient.isFeatureAvailable} implementation.
   *
   * @example
   * ```ts
   * // my-plugin/server/plugin.ts
   * public start(core: CoreStart) {
   *   const isPremiumFeatureAvailable = core.pricing.isFeatureAvailable('my_premium_feature');
   *   // Use the availability information to enable/disable functionality
   * }
   * ```
   */
  isFeatureAvailable: IPricingTiersClient['isFeatureAvailable'];
}
