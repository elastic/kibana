/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type {
  SavedObjectConfig,
  IKibanaMigrator,
} from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalSavedObjectsRequestHandlerContext } from '../internal_types';
import { registerGetRoute } from './get';
import { registerResolveRoute } from './resolve';
import { registerCreateRoute } from './create';
import { registerDeleteRoute } from './delete';
import { registerFindRoute } from './find';
import { registerUpdateRoute } from './update';
import { registerBulkGetRoute } from './bulk_get';
import { registerBulkCreateRoute } from './bulk_create';
import { registerBulkUpdateRoute } from './bulk_update';
import { registerBulkDeleteRoute } from './bulk_delete';
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
  const router =
    http.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
  registerGetRoute(router, { config, coreUsageData, logger });
  registerResolveRoute(router, { config, coreUsageData, logger });
  registerCreateRoute(router, { config, coreUsageData, logger });
  registerDeleteRoute(router, { config, coreUsageData, logger });
  registerFindRoute(router, { config, coreUsageData, logger });
  registerUpdateRoute(router, { config, coreUsageData, logger });
  registerBulkGetRoute(router, { config, coreUsageData, logger });
  registerBulkCreateRoute(router, { config, coreUsageData, logger });
  registerBulkResolveRoute(router, { config, coreUsageData, logger });
  registerBulkUpdateRoute(router, { config, coreUsageData, logger });
  registerBulkDeleteRoute(router, { config, coreUsageData, logger });
  registerExportRoute(router, { config, coreUsageData });
  registerImportRoute(router, { config, coreUsageData });
  registerResolveImportErrorsRoute(router, { config, coreUsageData });

  const legacyRouter = http.createRouter<InternalSavedObjectsRequestHandlerContext>('');
  registerLegacyImportRoute(legacyRouter, {
    maxImportPayloadBytes: config.maxImportPayloadBytes,
    coreUsageData,
    logger,
  });
  registerLegacyExportRoute(legacyRouter, { kibanaVersion, coreUsageData, logger });

  const internalRouter = http.createRouter<InternalSavedObjectsRequestHandlerContext>(
    '/internal/saved_objects/'
  );

  registerMigrateRoute(internalRouter, migratorPromise);
  registerDeleteUnknownTypesRoute(internalRouter, { kibanaIndex, kibanaVersion });
}
