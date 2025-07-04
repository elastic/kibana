/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreUsageStats, CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';

/** @internal */
export interface BaseIncrementOptions {
  request: KibanaRequest;
  types?: string[]; // we might not have info on the imported types for some operations, e.g. for import we're using a readStream
}

/** @internal */
export type IncrementSavedObjectsImportOptions = BaseIncrementOptions & {
  overwrite: boolean;
  createNewCopies: boolean;
  compatibilityMode?: boolean;
};

/** @internal */
export type IncrementSavedObjectsResolveImportErrorsOptions = BaseIncrementOptions & {
  createNewCopies: boolean;
  compatibilityMode?: boolean;
};

/** @internal */
export type IncrementSavedObjectsExportOptions = BaseIncrementOptions & {
  supportedTypes: string[];
};

/** @internal */
export interface ICoreUsageStatsClient {
  getUsageStats(): Promise<CoreUsageStats>;

  getDeprecatedApiUsageStats(): Promise<CoreDeprecatedApiUsageStats[]>;

  incrementDeprecatedApi(
    counterName: string,
    options: { resolved?: boolean; incrementBy?: number }
  ): Promise<void>;

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
