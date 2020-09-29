/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { HttpServiceSetup } from 'src/core/server';
import { ISavedObjectsManagement } from '../services';
import { registerFindRoute } from './find';
import { registerGetRoute } from './get';
import { registerScrollForCountRoute } from './scroll_count';
import { registerScrollForExportRoute } from './scroll_export';
import { registerRelationshipsRoute } from './relationships';
import { registerGetAllowedTypesRoute } from './get_allowed_types';

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  managementServicePromise: Promise<ISavedObjectsManagement>;
}

export function registerRoutes({ http, managementServicePromise }: RegisterRouteOptions) {
  const router = http.createRouter();
  registerFindRoute(router, managementServicePromise);
  registerGetRoute(router, managementServicePromise);
  registerScrollForCountRoute(router);
  registerScrollForExportRoute(router);
  registerRelationshipsRoute(router, managementServicePromise);
  registerGetAllowedTypesRoute(router);
}
