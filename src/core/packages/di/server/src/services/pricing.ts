/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';
import type { PricingServiceStart } from '@kbn/core-pricing-server';

/**
 * The pricing tier feature availability API.
 * @see {@link PricingServiceStart}
 * @public
 */
// TODO: is this enough? do we want to expose more?
export type IPricing = Pick<PricingServiceStart, 'isFeatureAvailable'>;

/**
 * The service checking feature availability against the active pricing tier.
 * @see {@link IPricing}
 * @public
 */
export const Pricing: ServiceToken<IPricing> = createToken('Pricing');
