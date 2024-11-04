/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import { PUBLIC_API_FEATURE_FLAG } from './api/constants';

export const featureFlags: FeatureFlagDefinitions = [
  {
    key: PUBLIC_API_FEATURE_FLAG,
    name: 'Dashboard HTTP API',
    description: 'Enable or disable the Dashboard HTTP API endpoints',
    tags: ['dashboard'],
    variationType: 'boolean',
    variations: [
      {
        name: 'Enabled',
        description: 'Enables the Dashboard HTTP API endpoints',
        value: true,
      },
      {
        name: 'Disabled',
        description: 'Disables the Dashboard HTTP API endpoints',
        value: false,
      },
    ],
  },
];
