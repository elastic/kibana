/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreUsageDataSetup, CoreIncrementUsageCounter } from '@kbn/core-usage-data-server';
import type { ISavedObjectTypeRegistry, SavedObjectsType } from '../..';

type SavedObjectTypeRegistry = ISavedObjectTypeRegistry & {
  registerType(type: SavedObjectsType): void;
};

/**
 * Inlined from @kbn/core-usage-data-base-server-internal to avoid circular dependency.
 * The original InternalCoreUsageDataSetup extends CoreUsageDataSetup and depends on
 * @kbn/core-saved-objects-server, which would create a cycle if added to kbn_references.
 * @internal
 */
export interface InternalCoreUsageDataSetup extends CoreUsageDataSetup {
  registerType(typeRegistry: SavedObjectTypeRegistry): void;
  getClient(): {
    incrementSavedObjectsBulkCreate(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsBulkGet(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsBulkResolve(options: {
      request: unknown;
      types?: string[];
    }): Promise<void>;
    incrementSavedObjectsBulkUpdate(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsBulkDelete(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsCreate(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsDelete(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsFind(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsGet(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsResolve(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsUpdate(options: { request: unknown; types?: string[] }): Promise<void>;
    incrementSavedObjectsImport(options: {
      request: unknown;
      types?: string[];
      createNewCopies: boolean;
      overwrite: boolean;
      compatibilityMode?: boolean;
    }): Promise<void>;
    incrementSavedObjectsResolveImportErrors(options: {
      request: unknown;
      types?: string[];
      createNewCopies: boolean;
      compatibilityMode?: boolean;
    }): Promise<void>;
    incrementSavedObjectsExport(options: {
      request: unknown;
      types?: string[];
      supportedTypes: string[];
    }): Promise<void>;
  };
  incrementUsageCounter: CoreIncrementUsageCounter;
}
