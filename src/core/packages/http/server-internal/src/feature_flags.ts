/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';

export const SELF_CALLABLE_ENFORCEMENT_FEATURE_FLAG = 'core.http.selfCallableEnforcement';

export const httpFeatureFlags: FeatureFlagDefinitions = [
  {
    key: SELF_CALLABLE_ENFORCEMENT_FEATURE_FLAG,
    name: 'Core HTTP self-callable enforcement',
    description: 'Enforces route opt-in for requests made by the scoped Kibana self HTTP client.',
    tags: ['core', 'http'],
    variationType: 'boolean',
    variations: [
      {
        name: 'Enforce',
        value: true,
      },
      {
        name: 'Observe',
        value: false,
      },
    ],
  },
];
