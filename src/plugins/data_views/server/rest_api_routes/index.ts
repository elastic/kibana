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
  ...Object.values(fieldRoutes),
  ...Object.values(runtimeRoutes),
  ...Object.values(scriptedRoutes),
  ...Object.values(createRoutes),
  ...Object.values(defaultRoutes),
  ...Object.values(deleteRoutes),
  ...Object.values(getRoutes),
  ...Object.values(hasRoutes),
  ...Object.values(updateRoutes),
];

export { routes };
