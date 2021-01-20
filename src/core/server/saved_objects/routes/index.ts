/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { InternalHttpServiceSetup } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';
import { Logger } from '../../logging';
import { SavedObjectConfig } from '../saved_objects_config';
import { IKibanaMigrator } from '../migrations';
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
import { registerMigrateRoute } from './migrate';

export function registerRoutes({
  http,
  coreUsageData,
  logger,
  config,
  migratorPromise,
}: {
  http: InternalHttpServiceSetup;
  coreUsageData: CoreUsageDataSetup;
  logger: Logger;
  config: SavedObjectConfig;
  migratorPromise: Promise<IKibanaMigrator>;
}) {
  const router = http.createRouter('/api/saved_objects/');

  registerGetRoute(router, { coreUsageData });
  registerCreateRoute(router, { coreUsageData });
  registerDeleteRoute(router, { coreUsageData });
  registerFindRoute(router, { coreUsageData });
  registerUpdateRoute(router, { coreUsageData });
  registerBulkGetRoute(router, { coreUsageData });
  registerBulkCreateRoute(router, { coreUsageData });
  registerBulkUpdateRoute(router, { coreUsageData });
  registerLogLegacyImportRoute(router, logger);
  registerExportRoute(router, { config, coreUsageData });
  registerImportRoute(router, { config, coreUsageData });
  registerResolveImportErrorsRoute(router, { config, coreUsageData });

  const internalRouter = http.createRouter('/internal/saved_objects/');

  registerMigrateRoute(internalRouter, migratorPromise);
}
