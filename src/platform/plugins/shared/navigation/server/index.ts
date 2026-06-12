/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { AGENT_BUILDER_NAV_AT_TOP_FLAG } from '../common/constants';

export const featureFlags: FeatureFlagDefinitions = [
  {
    key: AGENT_BUILDER_NAV_AT_TOP_FLAG,
    name: 'Agent Builder nav at top',
    description:
      'Controls the position of the Agent Builder link in solution navigation. ' +
      'When true, it appears near the top of the nav body; when false, in the middle or near the bottom.',
    tags: ['solution-nav', 'navigation', 'agent-builder'],
    variationType: 'boolean',
    variations: [
      {
        name: 'At top',
        description: 'Agent Builder link appears near the top of the nav body',
        value: true,
      },
      {
        name: 'Not at top',
        description: 'Agent Builder link appears in the middle or near the bottom of the nav body',
        value: false,
      },
    ],
  },
];

export async function plugin(initContext: PluginInitializerContext) {
  const { NavigationServerPlugin } = await import('./plugin');
  return new NavigationServerPlugin(initContext);
}
