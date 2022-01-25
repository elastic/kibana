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

import * as createRoutes from './create_index_pattern';
import * as defaultRoutes from './default_index_pattern';
import * as deleteRoutes from './delete_index_pattern';
import * as getRoutes from './get_index_pattern';
import * as hasRoutes from './has_user_index_pattern';
import * as updateRoutes from './update_index_pattern';

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
  deleteRoutes.registerDeleteDataViewRoute,
  deleteRoutes.registerDeleteDataViewRouteLegacy,
  getRoutes.registerGetDataViewRoute,
  getRoutes.registerGetDataViewRouteLegacy,
  hasRoutes.registerHasUserDataViewRoute,
  hasRoutes.registerHasUserDataViewRouteLegacy,
  updateRoutes.registerUpdateDataViewRoute,
  updateRoutes.registerUpdateDataViewRouteLegacy,
  ...Object.values(scriptedRoutes),
];

export { routes };
