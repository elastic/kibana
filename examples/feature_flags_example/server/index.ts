/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import {
  FeatureFlagExampleBoolean,
  FeatureFlagExampleNumber,
  FeatureFlagExampleString,
} from '../common/feature_flags';

export const featureFlags: FeatureFlagDefinitions = [
  {
    key: FeatureFlagExampleBoolean,
    name: 'Example boolean',
    description: 'This is a demo of a boolean flag',
    tags: ['example', 'my-plugin'],
    variationType: 'boolean',
    variations: [
      {
        name: 'On',
        description: 'Auto-hides the bar',
        value: true,
      },
      {
        name: 'Off',
        description: 'Static always-on',
        value: false,
      },
    ],
  },
  {
    key: FeatureFlagExampleString,
    name: 'Example string',
    description: 'This is a demo of a string flag',
    tags: ['example', 'my-plugin'],
    variationType: 'string',
    variations: [
      {
        name: 'Pink',
        value: '#D75489',
      },
      {
        name: 'Turquoise',
        value: '#65BAAF',
      },
    ],
  },
  {
    key: FeatureFlagExampleNumber,
    name: 'Example Number',
    description: 'This is a demo of a number flag',
    tags: ['example', 'my-plugin'],
    variationType: 'number',
    variations: [
      {
        name: 'Five',
        value: 5,
      },
      {
        name: 'Ten',
        value: 10,
      },
    ],
  },
];

export async function plugin(initializerContext: PluginInitializerContext) {
  const { FeatureFlagsExamplePlugin } = await import('./plugin');
  return new FeatureFlagsExamplePlugin(initializerContext);
}
