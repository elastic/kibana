/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  CapabilitiesAccessor,
  CapabilitiesProvider,
  type ICapabilitiesAccessor,
} from './src/services/capabilities';
export {
  ElasticsearchClient,
  InternalElasticsearchClient,
  type IScopedClusterClientFactory,
  ScopedClusterClient,
  ScopedClusterClientFactory,
} from './src/services/elasticsearch';
export {
  Request,
  Response,
  Route,
  type RouteDefinition,
  type RouteHandler,
  Router,
} from './src/services/http';
export {
  type ISavedObjectsClientFactory,
  SavedObjectsClient,
  SavedObjectsClientFactory,
  SavedObjectsTypeRegistry,
} from './src/services/saved_objects';
export { CoreSetup, CoreStart, PluginInitializer } from './src/services/lifecycle';
export { ApiKeys, AuditLogger, CurrentUser } from './src/services/security';
export { GlobalUiSettingsClient, UiSettingsClient } from './src/services/ui_settings';
export {
  type IUserProfileAccessor,
  type IUserProfileIdAccessor,
  UserProfileAccessor,
  UserProfileIdAccessor,
} from './src/services/user_profile';
