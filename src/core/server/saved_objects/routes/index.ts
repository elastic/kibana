/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InternalHttpServiceSetup } from '../../http';
import { InternalCoreUsageDataSetup } from '../../core_usage_data';
import { Logger } from '../../logging';
import { SavedObjectConfig } from '../saved_objects_config';
import { IKibanaMigrator } from '../migrations';
import { registerGetRoute } from './get';
import { registerResolveRoute } from './resolve';
import { registerCreateRoute } from './create';
import { registerDeleteRoute } from './delete';
import { registerFindRoute } from './find';
import { registerUpdateRoute } from './update';
import { registerBulkGetRoute } from './bulk_get';
import { registerBulkCreateRoute } from './bulk_create';
import { registerBulkUpdateRoute } from './bulk_update';
import { registerExportRoute } from './export';
import { registerImportRoute } from './import';
import { registerResolveImportErrorsRoute } from './resolve_import_errors';
import { registerMigrateRoute } from './migrate';
import { registerLegacyImportRoute } from './legacy_import_export/import';
import { registerLegacyExportRoute } from './legacy_import_export/export';
import { registerBulkResolveRoute } from './bulk_resolve';
import { registerDeleteUnknownTypesRoute } from './deprecations';

export function registerRoutes({
  http,
  coreUsageData,
  logger,
  config,
  migratorPromise,
  kibanaVersion,
  kibanaIndex,
}: {
  http: InternalHttpServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
  config: SavedObjectConfig;
  migratorPromise: Promise<IKibanaMigrator>;
  kibanaVersion: string;
  kibanaIndex: string;
}) {
  const router = http.createRouter('/api/saved_objects/');

  registerGetRoute(router, { coreUsageData });
  registerResolveRoute(router, { coreUsageData });
  registerCreateRoute(router, { coreUsageData });
  registerDeleteRoute(router, { coreUsageData });
  registerFindRoute(router, { coreUsageData });
  registerUpdateRoute(router, { coreUsageData });
  registerBulkGetRoute(router, { coreUsageData });
  registerBulkCreateRoute(router, { coreUsageData });
  registerBulkResolveRoute(router, { coreUsageData });
  registerBulkUpdateRoute(router, { coreUsageData });
  registerExportRoute(router, { config, coreUsageData });
  registerImportRoute(router, { config, coreUsageData });
  registerResolveImportErrorsRoute(router, { config, coreUsageData });

  const legacyRouter = http.createRouter('');
  registerLegacyImportRoute(legacyRouter, {
    maxImportPayloadBytes: config.maxImportPayloadBytes,
    coreUsageData,
    logger,
  });
  registerLegacyExportRoute(legacyRouter, { kibanaVersion, coreUsageData, logger });

  const internalRouter = http.createRouter('/internal/saved_objects/');

  registerMigrateRoute(internalRouter, migratorPromise);
  registerDeleteUnknownTypesRoute(internalRouter, { kibanaIndex, kibanaVersion });
}
