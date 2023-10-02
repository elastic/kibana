/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as fieldRoutes from './fields';
import * as runtimeRoutes from './runtime_fields';
import * as scriptedRoutes from './scripted_fields';

import * as createRoutes from './create_data_view';
import * as defaultRoutes from './default_data_view';
import * as deleteRoutes from './delete_data_view';
import * as getRoutes from './get_data_view';
import * as getAllRoutes from './get_data_views';
import * as hasRoutes from './has_user_data_view';
import * as updateRoutes from './update_data_view';
import { swapReferencesRoute } from './swap_references';

const routes = [
  fieldRoutes.registerUpdateFieldsRoute,
  fieldRoutes.registerUpdateFieldsRouteLegacy,
  runtimeRoutes.registerCreateRuntimeFieldRoute,
  runtimeRoutes.registerCreateRuntimeFieldRouteLegacy,
  runtimeRoutes.registerDeleteRuntimeFieldRoute,
  runtimeRoutes.registerDeleteRuntimeFieldRouteLegacy,
  runtimeRoutes.registerGetRuntimeFieldRoute,
  runtimeRoutes.registerGetRuntimeFieldRouteLegacy,
  runtimeRoutes.registerPutRuntimeFieldRoute,
  runtimeRoutes.registerPutRuntimeFieldRouteLegacy,
  runtimeRoutes.registerUpdateRuntimeFieldRoute,
  runtimeRoutes.registerUpdateRuntimeFieldRouteLegacy,
  createRoutes.registerCreateDataViewRoute,
  createRoutes.registerCreateDataViewRouteLegacy,
  defaultRoutes.registerManageDefaultDataViewRoute,
  defaultRoutes.registerManageDefaultDataViewRouteLegacy,
  deleteRoutes.registerDeleteDataViewRoute,
  deleteRoutes.registerDeleteDataViewRouteLegacy,
  getRoutes.registerGetDataViewRoute,
  getRoutes.registerGetDataViewRouteLegacy,
  getAllRoutes.registerGetDataViewsRoute,
  hasRoutes.registerHasUserDataViewRoute,
  hasRoutes.registerHasUserDataViewRouteLegacy,
  updateRoutes.registerUpdateDataViewRoute,
  updateRoutes.registerUpdateDataViewRouteLegacy,
  ...Object.values(scriptedRoutes),
  swapReferencesRoute({ previewRoute: false }),
  swapReferencesRoute({ previewRoute: true }),
];

export { routes };
