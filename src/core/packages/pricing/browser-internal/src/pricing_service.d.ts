/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { PricingServiceStart } from '@kbn/core-pricing-browser';
import type { CoreService } from '@kbn/core-base-browser-internal';
interface StartDeps {
  http: InternalHttpStart;
}
/**
 * Service that is responsible for UI Pricing.
 * @internal
 */
export declare class PricingService implements CoreService<{}, PricingServiceStart> {
  setup(): {};
  start({ http }: StartDeps): Promise<PricingServiceStart>;
  stop(): Promise<void>;
}
export {};
