/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObject } from '@kbn/core/server';
import type { ErrorToastOptions, ToastInputFields } from '@kbn/core-notifications-browser';

// Re-export all types from @kbn/data-views-types for backward compatibility
export type {
  RuntimeType,
  RuntimePrimitiveTypes,
  RuntimeFieldBase,
  RuntimeFieldSpec,
  RuntimeField,
  RuntimeFieldSubField,
  RuntimeFieldSubFields,
  FieldConfiguration,
  FieldFormatMap,
  FieldAttrs,
  FieldAttrSet,
  FieldAttrsAsObject,
  FieldSpecConflictDescriptions,
  FieldSpec,
  DataViewFieldMap,
  AggregationRestrictions,
  TypeMeta,
  SourceFilter,
  DataViewAttributes,
  DataViewSpec,
} from '@kbn/data-views-types';

export { DataViewType } from '@kbn/data-views-types';

// Re-export types needed by this module
import type { FieldSpec, DataViewAttributes } from '@kbn/data-views-types';

export type { QueryDslQueryContainer };
export type { SavedObject };

/**
 * Handler for data view notifications
 * @public
 * @param toastInputFields Toast notif config
 * @param key Used to dedupe notifs
 */
export type OnNotification = (toastInputFields: ToastInputFields, key: string) => void;

/**
 * Handler for data view errors
 * @public
 * @param error Error object
 * @param toastInputFields Toast notif config
 * @param key Used to dedupe notifs
 */
export type OnError = (error: Error, toastInputFields: ErrorToastOptions, key: string) => void;

/**
 * Interface for UiSettings common interface {@link UiSettingsClient}
 */
export interface UiSettingsCommon {
  /**
   * Get a setting value
   * @param key name of value
   */
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  /**
   * Get all settings values
   */
  getAll: () => Promise<Record<string, unknown>>;
  /**
   * Set a setting value
   * @param key name of value
   * @param value value to set
   */
  set: <T = unknown>(key: string, value: T) => Promise<void>;
  /**
   * Remove a setting value
   * @param key name of value
   */
  remove: (key: string) => Promise<void>;
}

/**
 * Saved objects common find args
 * @public
 */
export interface SavedObjectsClientCommonFindArgs {
  /**
   * Saved object fields
   */
  fields?: string[];
  /**
   * Results per page
   */
  perPage?: number;
  /**
   * Query string
   */
  search?: string;
  /**
   * Fields to search
   */
  searchFields?: string[];
}

/**
 * Common interface for the saved objects client on server and content management in browser
 * @public
 */
export interface PersistenceAPI {
  /**
   * Search for saved objects
   * @param options - options for search
   */
  find: (
    options: SavedObjectsClientCommonFindArgs
  ) => Promise<Array<SavedObject<DataViewAttributes>>>;
  /**
   * Get a single saved object by id
   * @param type - type of saved object
   * @param id - id of saved object
   */
  get: (id: string) => Promise<SavedObject<DataViewAttributes>>;
  /**
   * Update a saved object by id
   * @param type - type of saved object
   * @param id - id of saved object
   * @param attributes - attributes to update
   * @param options - client options
   */
  update: (
    id: string,
    attributes: DataViewAttributes,
    options: { version?: string }
  ) => Promise<SavedObject>;
  /**
   * Create a saved object
   * @param attributes - attributes to set
   * @param options - client options
   */
  create: (
    attributes: DataViewAttributes,
    // SavedObjectsCreateOptions
    options: { id?: string; initialNamespaces?: string[]; overwrite?: boolean; managed?: boolean }
  ) => Promise<SavedObject>;
  /**
   * Delete a saved object by id
   * @param type - type of saved object
   * @param id - id of saved object
   */
  delete: (id: string) => Promise<void>;
}

export interface GetFieldsOptions {
  pattern: string;
  type?: string;
  metaFields?: string[];
  rollupIndex?: string;
  allowNoIndex?: boolean;
  indexFilter?: QueryDslQueryContainer;
  includeUnmapped?: boolean;
  fields?: string[];
  allowHidden?: boolean;
  forceRefresh?: boolean;
  fieldTypes?: string[];
  includeEmptyFields?: boolean;
  abortSignal?: AbortSignal;
  runtimeMappings?: estypes.MappingRuntimeFields;
}

// omit items saved DataView
type FieldsForWildcardSpec = Omit<
  FieldSpec,
  'format' | 'customLabel' | 'runtimeField' | 'count' | 'customDescription'
>;

/**
 * FieldsForWildcard response
 */
export interface FieldsForWildcardResponse {
  fields: FieldsForWildcardSpec[];
  indices: string[];
  etag?: string;
}

/**
 * Existing Indices response
 */
export type ExistingIndicesResponse = string[];

export interface IDataViewsApiClient {
  getFieldsForWildcard: (options: GetFieldsOptions) => Promise<FieldsForWildcardResponse>;
  hasUserDataView: () => Promise<boolean>;
}

export interface HasDataService {
  hasESData: () => Promise<boolean>;
  hasUserDataView: () => Promise<boolean>;
  hasDataView: () => Promise<boolean>;
}

export interface ClientConfigType {
  scriptedFieldsEnabled?: boolean;
  dataTiersExcludedForFields?: string;
  fieldListCachingEnabled?: boolean;
  hasEsDataTimeout: number;
}
