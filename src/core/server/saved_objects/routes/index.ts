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

import { InternalHttpServiceSetup } from '../../http';
import { Logger } from '../../logging';
import { SavedObjectConfig } from '../saved_objects_config';
import { registerGetRoute } from './get';
import { registerCreateRoute } from './create';
import { registerDeleteRoute } from './delete';
import { registerFindRoute } from './find';
import { registerUpdateRoute } from './update';
import { registerBulkGetRoute } from './bulk_get';
import { registerBulkCreateRoute } from './bulk_create';
import { registerBulkUpdateRoute } from './bulk_update';
import { registerLogLegacyImportRoute } from './log_legacy_import';
import { registerExportRoute } from './export';
import { registerImportRoute } from './import';
import { registerResolveImportErrorsRoute } from './resolve_import_errors';

export function registerRoutes({
  http,
  logger,
  config,
  importableExportableTypes,
}: {
  http: InternalHttpServiceSetup;
  logger: Logger;
  config: SavedObjectConfig;
  importableExportableTypes: string[];
}) {
  const router = http.createRouter('/api/saved_objects/');

  registerGetRoute(router);
  registerCreateRoute(router);
  registerDeleteRoute(router);
  registerFindRoute(router);
  registerUpdateRoute(router);
  registerBulkGetRoute(router);
  registerBulkCreateRoute(router);
  registerBulkUpdateRoute(router);
  registerLogLegacyImportRoute(router, logger);
  registerExportRoute(router, config, importableExportableTypes);
  registerImportRoute(router, config, importableExportableTypes);
  registerResolveImportErrorsRoute(router, config, importableExportableTypes);
}
