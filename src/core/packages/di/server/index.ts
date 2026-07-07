/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { CapabilitiesProvider } from './src/services/capabilities';
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
