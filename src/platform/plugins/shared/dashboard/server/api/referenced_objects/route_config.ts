/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagsRequestHandlerContext } from '@kbn/core-feature-flags-server';
import { EXPORT_REFERENCED_OBJECTS_ENABLED_FLAG } from '../../../common/constants';
import { getRouteConfig } from '../get_route_config';

const { routeConfig } = getRouteConfig(false);

export const referencedObjectsRouteConfig = {
  ...routeConfig,
  options: {
    ...routeConfig.options,
    availability: {
      stability: 'experimental',
      since: '9.7.0',
    },
    // Remove when the EXPORT_REFERENCED_OBJECTS_ENABLED_FLAG feature flag is removed.
    excludeFromOAS: true,
  },
  security: {
    authz: {
      enabled: false,
      reason: 'Relies on Saved Objects Client for authorization',
    },
  },
} as const;

export const TECHNICAL_PREVIEW_NOTE =
  'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.';

export const isExportReferencedObjectsEnabled = (
  featureFlags: FeatureFlagsRequestHandlerContext
): Promise<boolean> => featureFlags.getBooleanValue(EXPORT_REFERENCED_OBJECTS_ENABLED_FLAG, false);
