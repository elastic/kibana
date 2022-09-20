/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreUsageStats } from '@kbn/core-usage-data-server';

/** @internal */
export interface BaseIncrementOptions {
  request: KibanaRequest;
}

/** @internal */
export type IncrementSavedObjectsImportOptions = BaseIncrementOptions & {
  overwrite: boolean;
  createNewCopies: boolean;
};

/** @internal */
export type IncrementSavedObjectsResolveImportErrorsOptions = BaseIncrementOptions & {
  createNewCopies: boolean;
};

/** @internal */
export type IncrementSavedObjectsExportOptions = BaseIncrementOptions & {
  types?: string[];
  supportedTypes: string[];
};

/** @internal */
export interface ICoreUsageStatsClient {
  getUsageStats(): Promise<CoreUsageStats>;

  incrementSavedObjectsBulkCreate(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsBulkGet(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsBulkResolve(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsBulkUpdate(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsBulkDelete(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsCreate(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsDelete(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsFind(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsGet(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsResolve(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsUpdate(options: BaseIncrementOptions): Promise<void>;

  incrementSavedObjectsImport(options: IncrementSavedObjectsImportOptions): Promise<void>;

  incrementSavedObjectsResolveImportErrors(
    options: IncrementSavedObjectsResolveImportErrorsOptions
  ): Promise<void>;

  incrementSavedObjectsExport(options: IncrementSavedObjectsExportOptions): Promise<void>;

  incrementLegacyDashboardsImport(options: BaseIncrementOptions): Promise<void>;

  incrementLegacyDashboardsExport(options: BaseIncrementOptions): Promise<void>;
}
