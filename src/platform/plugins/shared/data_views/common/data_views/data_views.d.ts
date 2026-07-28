/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { PersistenceAPI } from '../types';
import type { DataViewLazy } from './data_view_lazy';
import type { AbstractDataView } from './abstract_data_views';
import type { DataView } from './data_view';
import type {
  OnNotification,
  OnError,
  UiSettingsCommon,
  IDataViewsApiClient,
  GetFieldsOptions,
  DataViewSpec,
  DataViewAttributes,
  FieldAttrsAsObject,
  FieldSpec,
  DataViewFieldMap,
  TypeMeta,
} from '../types';
import type { SavedObject } from '..';
export type DataViewSavedObjectAttrs = Pick<
  DataViewAttributes,
  'title' | 'type' | 'typeMeta' | 'name' | 'timeFieldName'
>;
/**
 * Result from data view search - summary data.
 */
export interface DataViewListItem {
  /**
   * Saved object id (or generated id if in-memory only)
   */
  id: string;
  /**
   * Namespace ids
   */
  namespaces?: string[];
  /**
   * Data view title
   */
  title: string;
  /**
   * Data view type
   */
  type?: string;
  /**
   * Data view type meta
   */
  typeMeta?: TypeMeta;
  /**
   * Human-readable name
   */
  name?: string;
  /**
   * Time field name if applicable
   */
  timeFieldName?: string;
  /**
   * Whether the data view is managed by the application.
   */
  managed?: boolean;
}
/**
 * Data views API service dependencies
 */
export interface DataViewsServiceDeps {
  /**
   * UiSettings service instance wrapped in a common interface
   */
  uiSettings: UiSettingsCommon;
  /**
   * Saved objects client interface wrapped in a common interface
   */
  savedObjectsClient: PersistenceAPI;
  /**
   * Wrapper around http call functionality so it can be used on client or server
   */
  apiClient: IDataViewsApiClient;
  /**
   * Field formats service
   */
  fieldFormats: FieldFormatsStartCommon;
  /**
   * Handler for service notifications
   */
  onNotification: OnNotification;
  /**
   * Handler for service errors
   */
  onError: OnError;
  /**
   * Redirects when there's no data view. only used on client
   */
  onRedirectNoIndexPattern?: () => void;
  /**
   * Determines whether the user can save data views
   */
  getCanSave: () => Promise<boolean>;
  /**
   * Determines whether the user can save advancedSettings (used for defaultIndex)
   */
  getCanSaveAdvancedSettings: () => Promise<boolean>;
  scriptedFieldsEnabled: boolean;
}
/**
 * Data views API service methods
 * @public
 */
export interface DataViewsServicePublicMethods {
  /**
   * Clear the cache of data view saved objects.
   */
  clearCache: () => void;
  /**
   * Clear the cache of data view instances.
   */
  clearInstanceCache: (id?: string) => void;
  /**
   * Clear the cache of lazy data view instances.
   */
  clearDataViewLazyCache: (id: string) => void;
  /**
   * Create data view based on the provided spec.
   * @param spec - Data view spec.
   * @param skipFetchFields - If true, do not fetch fields.
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  create: (
    spec: DataViewSpec,
    skipFetchFields?: boolean,
    displayErrors?: boolean
  ) => Promise<DataView>;
  /**
   * Create and save data view based on provided spec.
   * @param spec - Data view spec.
   * @param override - If true, save over existing data view
   * @param skipFetchFields - If true, do not fetch fields.
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  createAndSave: (
    spec: DataViewSpec,
    override?: boolean,
    skipFetchFields?: boolean,
    displayErrors?: boolean
  ) => Promise<DataView>;
  /**
   * Save data view
   * @param dataView - Data view  or data view lazy instance to save.
   * @param override - If true, save over existing data view
   */
  createSavedObject: (indexPattern: AbstractDataView, overwrite?: boolean) => Promise<void>;
  /**
   * Delete data view
   * @param indexPatternId - Id of the data view to delete.
   */
  delete: (indexPatternId: string) => Promise<void>;
  /**
   * Takes field array and field attributes and returns field map by name.
   * @param fields - Array of fieldspecs
   * @params fieldAttrs - Field attributes, map by name
   * @returns Field map by name
   */
  fieldArrayToMap: (fields: FieldSpec[], fieldAttrs?: FieldAttrsAsObject) => DataViewFieldMap;
  /**
   * Search for data views based on title
   * @param search - Search string
   * @param size - Number of results to return
   */
  find: (search: string, size?: number) => Promise<DataView[]>;
  /**
   * Find and load lazy data views by title.
   * @param search - Search string
   * @param size - Number of results to return
   */
  findLazy: (search: string, size?: number) => Promise<DataViewLazy[]>;
  /**
   * Get data view by id.
   * @param id - Id of the data view to get.
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  get: (id: string, displayErrors?: boolean, refreshFields?: boolean) => Promise<DataView>;
  /**
   * Get populated data view saved object cache.
   */
  getCache: () => Promise<Array<SavedObject<DataViewSavedObjectAttrs>> | null | undefined>;
  /**
   * If user can save data view, return true.
   */
  getCanSave: () => Promise<boolean>;
  /**
   * Get default data view as data view instance.
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  getDefault: (displayErrors?: boolean) => Promise<DataView | null>;
  /**
   * Get default data view id.
   */
  getDefaultId: () => Promise<string | null>;
  /**
   * Get default data view, if it doesn't exist, choose and save new default data view and return it.
   * @param {Object} options
   * @param {boolean} options.refreshFields - If true, will refresh the fields of the default data view
   * @param {boolean} [options.displayErrors=true] - If set false, API consumer is responsible for displaying and handling errors.
   */
  getDefaultDataView: (options?: {
    refreshFields?: boolean;
    displayErrors?: boolean;
  }) => Promise<DataView | null>;
  /**
   * Get fields for data view
   * @param dataView - Data view instance or spec
   * @param options - Options for getting fields
   * @returns FieldSpec array
   */
  getFieldsForIndexPattern: (
    indexPattern: DataView | DataViewSpec,
    options?: Omit<GetFieldsOptions, 'allowNoIndex' | 'pattern'>
  ) => Promise<FieldSpec[]>;
  /**
   * Get fields for index pattern string
   * @param options - options for getting fields
   */
  getFieldsForWildcard: (options: GetFieldsOptions) => Promise<FieldSpec[]>;
  /**
   * Get list of data view ids.
   * @param refresh - clear cache and fetch from server
   */
  getIds: (refresh?: boolean) => Promise<string[]>;
  /**
   * Get list of data view ids and title (and more) for each data view.
   * @param refresh - clear cache and fetch from server
   */
  getIdsWithTitle: (refresh?: boolean) => Promise<DataViewListItem[]>;
  /**
   * Get list of data view ids and title (and more) for each data view.
   * @param refresh - clear cache and fetch from server
   */
  getTitles: (refresh?: boolean) => Promise<string[]>;
  /**
   * Returns true if user has access to view a data view.
   */
  hasUserDataView: () => Promise<boolean>;
  /**
   * Refresh fields for data view instance
   * @params dataView - Data view instance
   */
  refreshFields: (
    indexPattern: DataView,
    displayErrors?: boolean,
    forceRefresh?: boolean
  ) => Promise<void>;
  /**
   * Converts data view saved object to spec
   * @params savedObject - Data view saved object
   */
  savedObjectToSpec: (savedObject: SavedObject<DataViewAttributes>) => DataViewSpec;
  /**
   * Set default data view.
   * @param id - Id of the data view to set as default.
   * @param force - Overwrite if true
   */
  setDefault: (id: string | null, force?: boolean) => Promise<void>;
  /**
   * Save saved object
   * @param indexPattern - data view instance
   * @param saveAttempts - number of times to try saving
   * @oaram ignoreErrors - if true, do not throw error on failure
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  updateSavedObject: (
    indexPattern: AbstractDataView,
    saveAttempts?: number,
    ignoreErrors?: boolean,
    displayErrors?: boolean
  ) => Promise<void>;
  /**
   * Returns whether a default data view exists.
   */
  defaultDataViewExists: () => Promise<boolean>;
  getMetaFields: () => Promise<string[] | undefined>;
  getShortDotsEnable: () => Promise<boolean | undefined>;
  toDataView: (toDataView: DataViewLazy) => Promise<DataView>;
  toDataViewLazy: (dataView: DataView) => Promise<DataViewLazy>;
  getAllDataViewLazy: () => Promise<DataViewLazy[]>;
  getDataViewLazy: (id: string) => Promise<DataViewLazy>;
  getDataViewLazyFromCache: (id: string) => Promise<DataViewLazy | undefined>;
  createDataViewLazy: (spec: DataViewSpec) => Promise<DataViewLazy>;
  createAndSaveDataViewLazy: (spec: DataViewSpec, override?: boolean) => Promise<DataViewLazy>;
  getDefaultDataViewLazy: () => Promise<DataViewLazy | null>;
}
/**
 * Data views service, providing CRUD operations for data views.
 * @public
 */
export declare class DataViewsService {
  private config;
  private savedObjectsClient;
  private savedObjectsCache?;
  private apiClient;
  private fieldFormats;
  /**
   * Handler for service notifications
   * @param toastInputFields notification content in toast format
   * @param key used to indicate uniqueness of the notification
   */
  private onNotification;
  private onError;
  private dataViewCache;
  private dataViewLazyCache;
  /**
   * Can the user save advanced settings?
   */
  private getCanSaveAdvancedSettings;
  /**
   * Can the user save data views?
   */
  getCanSave: () => Promise<boolean>;
  readonly scriptedFieldsEnabled: boolean;
  /**
   * DataViewsService constructor
   * @param deps Service dependencies
   */
  constructor(deps: DataViewsServiceDeps);
  /**
   * Refresh cache of index pattern ids and titles.
   */
  private refreshSavedObjectsCache;
  /**
   * Gets list of index pattern ids.
   * @param refresh Force refresh of index pattern list
   */
  getIds: (refresh?: boolean) => Promise<string[]>;
  /**
   * Gets list of index pattern titles.
   * @param refresh Force refresh of index pattern list
   */
  getTitles: (refresh?: boolean) => Promise<string[]>;
  /**
   * Find and load index patterns by title.
   * @param search Search string
   * @param size  Number of data views to return
   * @returns DataView[]
   */
  find: (search: string, size?: number) => Promise<DataView[]>;
  /**
   * Find and load lazy data views by title.
   * @param search Search string
   * @param size  Number of data views to return
   * @returns DataViewLazy[]
   */
  findLazy: (search: string, size?: number) => Promise<DataViewLazy[]>;
  /**
   * Gets list of index pattern ids with titles.
   * @param refresh Force refresh of index pattern list
   */
  getIdsWithTitle: (refresh?: boolean) => Promise<DataViewListItem[]>;
  getAllDataViewLazy: (refresh?: boolean) => Promise<DataViewLazy[]>;
  /**
   * Clear index pattern saved objects cache.
   */
  clearCache: () => void;
  /**
   * Clear index pattern instance cache
   */
  clearInstanceCache: (id?: string) => void;
  /**
   * Clear instance in data view lazy cache
   */
  clearDataViewLazyCache: (id: string) => void;
  /**
   * Get cache, contains data view saved objects.
   */
  getCache: () => Promise<SavedObject<DataViewSavedObjectAttrs>[] | null | undefined>;
  /**
   * Get default index pattern
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  getDefault: (displayErrors?: boolean) => Promise<DataView | null>;
  /**
   * Get default index pattern id
   */
  getDefaultId: () => Promise<string | null>;
  /**
   * Optionally set default index pattern, unless force = true
   * @param id data view id
   * @param force set default data view even if there's an existing default
   */
  setDefault: (id: string | null, force?: boolean) => Promise<void>;
  /**
   * Checks if current user has a user created index pattern ignoring fleet's server default index patterns.
   */
  hasUserDataView(): Promise<boolean>;
  getMetaFields: () => Promise<string[] | undefined>;
  getShortDotsEnable: () => Promise<boolean | undefined>;
  /**
   * Get field list by providing { pattern }.
   * @param options options for getting field list
   * @returns FieldSpec[]
   */
  getFieldsForWildcard: (options: GetFieldsOptions) => Promise<FieldSpec[]>;
  /**
   * Get field list by providing an index pattern (or spec).
   * @param options options for getting field list
   * @returns FieldSpec[]
   */
  getFieldsForIndexPattern: (
    indexPattern: DataView | DataViewSpec,
    options?: Omit<GetFieldsOptions, 'allowNoIndex' | 'pattern'>
  ) => Promise<FieldSpec[]>;
  private getFieldsAndIndicesForDataView;
  private getFieldsAndIndicesForWildcard;
  private refreshFieldsFn;
  /**
   * Refresh field list for a given data view.
   * @param dataView
   * @param displayErrors  - If set false, API consumer is responsible for displaying and handling errors.
   */
  refreshFields: (
    dataView: DataView,
    displayErrors?: boolean,
    forceRefresh?: boolean
  ) => Promise<void>;
  /**
   * Refreshes a field list from a spec before an index pattern instance is created.
   * @param fields
   * @param id
   * @param title
   * @param options
   * @returns Record<string, FieldSpec>
   */
  private refreshFieldSpecMap;
  /**
   * Converts field array to map.
   * @param fields: FieldSpec[]
   * @param fieldAttrs: FieldAttrs
   * @returns Record<string, FieldSpec>
   */
  fieldArrayToMap: (fields: FieldSpec[], fieldAttrs?: FieldAttrsAsObject) => DataViewFieldMap;
  /**
   * Converts data view saved object to data view spec.
   * @param savedObject
   * @returns DataViewSpec
   */
  savedObjectToSpec: (savedObject: SavedObject<DataViewAttributes>) => DataViewSpec;
  private getSavedObjectAndInit;
  private initFromSavedObjectLoadFields;
  private initFromSavedObject;
  private getRuntimeFields;
  getDataViewLazy: (id: string) => Promise<DataViewLazy>;
  getDataViewLazyFromCache: (id: string) => Promise<DataViewLazy | undefined>;
  /**
   * Get an index pattern by id, cache optimized.
   * @param id
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   * @param refreshFields - If set true, will fetch fields from the index pattern
   */
  get: (id: string, displayErrors?: boolean, refreshFields?: boolean) => Promise<DataView>;
  /**
   * Create a new data view instance.
   * @param spec data view spec
   * @param skipFetchFields if true, will not fetch fields
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   * @returns DataView
   */
  private createFromSpec;
  /**
   * Create data view instance.
   * @param spec data view spec
   * @param skipFetchFields if true, will not fetch fields
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   * @returns DataView
   */
  create(spec: DataViewSpec, skipFetchFields?: boolean, displayErrors?: boolean): Promise<DataView>;
  /**
   * Create a new data view instance.
   * @param spec data view spec
   * @returns DataViewLazy
   */
  private createFromSpecLazy;
  /**
   * Create data view lazy instance.
   * @param spec data view spec
   * @returns DataViewLazy
   */
  createDataViewLazy(spec: DataViewSpec): Promise<DataViewLazy>;
  /**
   * Create a new data view lazy and save it right away.
   * @param spec data view spec
   * @param override Overwrite if existing index pattern exists.
   */
  createAndSaveDataViewLazy(spec: DataViewSpec, overwrite?: boolean): Promise<DataViewLazy>;
  /**
   * Create a new data view and save it right away.
   * @param spec data view spec
   * @param override Overwrite if existing index pattern exists.
   * @param skipFetchFields Whether to skip field refresh step.
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  createAndSave(
    spec: DataViewSpec,
    overwrite?: boolean,
    skipFetchFields?: boolean,
    displayErrors?: boolean
  ): Promise<DataView>;
  /**
   * Save a new data view.
   * @param dataView data view instance
   * @param override Overwrite if existing index pattern exists
   */
  createSavedObject(dataView: AbstractDataView, overwrite?: boolean): Promise<void>;
  /**
   * Save existing data view. Will attempt to merge differences if there are conflicts.
   * @param indexPattern
   * @param saveAttempts
   * @param ignoreErrors
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  updateSavedObject(
    indexPattern: AbstractDataView,
    saveAttempts?: number,
    ignoreErrors?: boolean,
    displayErrors?: boolean
  ): Promise<void>;
  /**
   * Deletes an index pattern from .kibana index.
   * @param indexPatternId: Id of kibana Index Pattern to delete
   */
  delete(indexPatternId: string): Promise<void>;
  private getDefaultDataViewId;
  /**
   * Returns whether a default data view exists.
   */
  defaultDataViewExists(): Promise<boolean>;
  /**
   * Returns the default data view as a DataViewLazy.
   * If no default is found, or it is missing
   * another data view is selected as default and returned.
   * If no possible data view found to become a default returns null.
   *
   * @returns default data view lazy
   */
  getDefaultDataViewLazy(): Promise<DataViewLazy | null>;
  /**
   * Returns the default data view as an object.
   * If no default is found, or it is missing
   * another data view is selected as default and returned.
   * If no possible data view found to become a default returns null.
   *
   * @param {Object} options
   * @param {boolean} options.refreshFields - If true, will refresh the fields of the default data view
   * @param {boolean} [options.displayErrors=true] - If set false, API consumer is responsible for displaying and handling errors.
   * @returns default data view
   */
  getDefaultDataView(options?: {
    displayErrors?: boolean;
    refreshFields?: boolean;
  }): Promise<DataView | null>;
  toDataView(dataViewLazy: DataViewLazy): Promise<DataView>;
  toDataViewLazy(dataView: DataView): Promise<DataViewLazy>;
}
/**
 * Data views service interface
 * @public
 */
export type DataViewsContract = PublicMethodsOf<DataViewsService>;
