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
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';

/**
 * The feature flags evaluation API.
 * @see {@link FeatureFlagsStart}
 * @public
 */
// TODO: is this enough? do we want to expose more?
export type IFeatureFlags = Omit<FeatureFlagsStart, 'appendContext'>;

/**
 * The feature flags evaluation service.
 * @see {@link IFeatureFlags}
 * @public
 */
export const FeatureFlags: ServiceToken<IFeatureFlags> = createToken('FeatureFlags');
