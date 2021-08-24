/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import type { CoreUsageDataSetup } from '../../core_usage_data/types';
import type { InternalHttpServiceSetup } from '../../http/types';
import type { IKibanaMigrator } from '../migrations/kibana/kibana_migrator';
import { SavedObjectConfig } from '../saved_objects_config';
import { registerBulkCreateRoute } from './bulk_create';
import { registerBulkGetRoute } from './bulk_get';
import { registerBulkUpdateRoute } from './bulk_update';
import { registerCreateRoute } from './create';
import { registerDeleteRoute } from './delete';
import { registerExportRoute } from './export';
import { registerFindRoute } from './find';
import { registerGetRoute } from './get';
import { registerImportRoute } from './import';
import { registerLogLegacyImportRoute } from './log_legacy_import';
import { registerMigrateRoute } from './migrate';
import { registerResolveRoute } from './resolve';
import { registerResolveImportErrorsRoute } from './resolve_import_errors';
import { registerUpdateRoute } from './update';

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
  registerResolveRoute(router, { coreUsageData });
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
