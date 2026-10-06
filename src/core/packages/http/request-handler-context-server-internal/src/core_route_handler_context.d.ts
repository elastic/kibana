/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { CoreElasticsearchRouteHandlerContext } from '@kbn/core-elasticsearch-server-internal';
import { type InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import type { CoreSavedObjectsRouteHandlerContext } from '@kbn/core-saved-objects-server-internal';
import { type InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { CoreDeprecationsRouteHandlerContext } from '@kbn/core-deprecations-server-internal';
import { type InternalDeprecationsServiceStart } from '@kbn/core-deprecations-server-internal';
import type { CoreUiSettingsRouteHandlerContext } from '@kbn/core-ui-settings-server-internal';
import { type InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import type { CoreSecurityRouteHandlerContext } from '@kbn/core-security-server-internal';
import { type InternalSecurityServiceStart } from '@kbn/core-security-server-internal';
import type { CoreUserProfileRouteHandlerContext } from '@kbn/core-user-profile-server-internal';
import { type InternalUserProfileServiceStart } from '@kbn/core-user-profile-server-internal';
import type { CoreFeatureFlagsRouteHandlerContext } from '@kbn/core-feature-flags-server-internal';
import { type InternalFeatureFlagsStart } from '@kbn/core-feature-flags-server-internal';
/**
 * Subset of `InternalCoreStart` used by {@link CoreRouteHandlerContext}
 * @internal
 */
export interface CoreRouteHandlerContextParams {
  featureFlags: InternalFeatureFlagsStart;
  elasticsearch: InternalElasticsearchServiceStart;
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
  deprecations: InternalDeprecationsServiceStart;
  security: InternalSecurityServiceStart;
  userProfile: InternalUserProfileServiceStart;
}
/**
 * The concrete implementation for Core's route handler context.
 *
 * @internal
 */
export declare class CoreRouteHandlerContext implements CoreRequestHandlerContext {
  #private;
  private readonly coreStart;
  private readonly request;
  constructor(coreStart: CoreRouteHandlerContextParams, request: KibanaRequest);
  get featureFlags(): CoreFeatureFlagsRouteHandlerContext;
  get elasticsearch(): CoreElasticsearchRouteHandlerContext;
  get savedObjects(): CoreSavedObjectsRouteHandlerContext;
  get uiSettings(): CoreUiSettingsRouteHandlerContext;
  get deprecations(): CoreDeprecationsRouteHandlerContext;
  get security(): CoreSecurityRouteHandlerContext;
  get userProfile(): CoreUserProfileRouteHandlerContext;
}
