/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { FieldFormatsStartCommon, FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '..';
import { SavedObjectsClientCommon } from '../types';

import { createDataViewCache } from '.';
import type { RuntimeField, RuntimeFieldSpec, RuntimeType } from '../types';
import { DataView } from './data_view';
import {
  OnNotification,
  OnError,
  UiSettingsCommon,
  IDataViewsApiClient,
  GetFieldsOptions,
  DataViewSpec,
  DataViewAttributes,
  FieldAttrs,
  FieldSpec,
  DataViewFieldMap,
  TypeMeta,
} from '../types';
import { META_FIELDS, SavedObject } from '..';
import { DataViewMissingIndices } from '../lib';
import { findByName } from '../utils';
import { DuplicateDataViewError, DataViewInsufficientAccessError } from '../errors';

const MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS = 3;

/*
 * Attributes of the data view saved object
 * @public
 */
export type DataViewSavedObjectAttrs = Pick<
  DataViewAttributes,
  'title' | 'type' | 'typeMeta' | 'name'
>;

export type IndexPatternListSavedObjectAttrs = Pick<
  DataViewAttributes,
  'title' | 'type' | 'typeMeta' | 'name'
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
  name?: string;
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
  savedObjectsClient: SavedObjectsClientCommon;
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
   * @param dataView - Data view instance to save.
   * @param override - If true, save over existing data view
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  createSavedObject: (
    indexPattern: DataView,
    override?: boolean,
    displayErrors?: boolean
  ) => Promise<DataView>;
  /**
   * Delete data view
   * @param indexPatternId - Id of the data view to delete.
   */
  delete: (indexPatternId: string) => Promise<{}>;
  /**
   * Takes field array and field attributes and returns field map by name.
   * @param fields - Array of fieldspecs
   * @params fieldAttrs - Field attributes, map by name
   * @returns Field map by name
   */
  fieldArrayToMap: (fields: FieldSpec[], fieldAttrs?: FieldAttrs | undefined) => DataViewFieldMap;
  /**
   * Search for data views based on title
   * @param search - Search string
   * @param size - Number of results to return
   */
  find: (search: string, size?: number) => Promise<DataView[]>;
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
   * @param refreshFields - refresh field list when true
   */
  getDefaultDataView: (refreshFields?: boolean) => Promise<DataView | null>;
  /**
   * Get fields for data view
   * @param dataView - Data view instance or spec
   * @param options - Options for getting fields
   * @returns FieldSpec array
   */
  getFieldsForIndexPattern: (
    indexPattern: DataView | DataViewSpec,
    options?: Omit<GetFieldsOptions, 'pattern'> | undefined
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
  refreshFields: (indexPattern: DataView, displayErrors?: boolean) => Promise<void>;
  /**
   * Converts data view saved object to spec
   * @params savedObject - Data view saved object
   * @params displayErrors - If set false, API consumer is responsible for displaying and handling errors.
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
    indexPattern: DataView,
    saveAttempts?: number,
    ignoreErrors?: boolean,
    displayErrors?: boolean
  ) => Promise<DataView | void | Error>;
}

/**
 * Data views service, providing CRUD operations for data views.
 * @public
 */
export class DataViewsService {
  private config: UiSettingsCommon;
  private savedObjectsClient: SavedObjectsClientCommon;
  private savedObjectsCache?: Array<SavedObject<DataViewSavedObjectAttrs>> | null;
  private apiClient: IDataViewsApiClient;
  private fieldFormats: FieldFormatsStartCommon;
  /**
   * Handler for service notifications
   * @param toastInputFields notification content in toast format
   * @param key used to indicate uniqueness of the notification
   */
  private onNotification: OnNotification;
  /*
   * Handler for service errors
   * @param error notification content in toast format
   * @param key used to indicate uniqueness of the error
   */
  private onError: OnError;
  private dataViewCache: ReturnType<typeof createDataViewCache>;
  /**
   * Can the user save advanced settings?
   */
  private getCanSaveAdvancedSettings: () => Promise<boolean>;
  /**
   * Can the user save data views?
   */
  public getCanSave: () => Promise<boolean>;
  /**
   * DataViewsService constructor
   * @param deps Service dependencies
   */
  constructor(deps: DataViewsServiceDeps) {
    const {
      uiSettings,
      savedObjectsClient,
      apiClient,
      fieldFormats,
      onNotification,
      onError,
      getCanSave = () => Promise.resolve(false),
      getCanSaveAdvancedSettings,
    } = deps;
    this.apiClient = apiClient;
    this.config = uiSettings;
    this.savedObjectsClient = savedObjectsClient;
    this.fieldFormats = fieldFormats;
    this.onNotification = onNotification;
    this.onError = onError;
    this.getCanSave = getCanSave;
    this.getCanSaveAdvancedSettings = getCanSaveAdvancedSettings;

    this.dataViewCache = createDataViewCache();
  }

  /**
   * Refresh cache of index pattern ids and titles.
   */
  private async refreshSavedObjectsCache() {
    const so = await this.savedObjectsClient.find<DataViewSavedObjectAttrs>({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      fields: ['title', 'type', 'typeMeta', 'name'],
      perPage: 10000,
    });
    this.savedObjectsCache = so;
  }

  /**
   * Gets list of index pattern ids.
   * @param refresh Force refresh of index pattern list
   */
  getIds = async (refresh: boolean = false) => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => obj?.id);
  };

  /**
   * Gets list of index pattern titles.
   * @param refresh Force refresh of index pattern list
   */
  getTitles = async (refresh: boolean = false): Promise<string[]> => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => obj?.attributes?.title);
  };

  /**
   * Find and load index patterns by title.
   * @param search Search string
   * @param size  Number of data views to return
   * @returns DataView[]
   */
  find = async (search: string, size: number = 10): Promise<DataView[]> => {
    const savedObjects = await this.savedObjectsClient.find<DataViewSavedObjectAttrs>({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      fields: ['title'],
      search,
      searchFields: ['title'],
      perPage: size,
    });
    const getIndexPatternPromises = savedObjects.map(async (savedObject) => {
      return await this.get(savedObject.id);
    });
    return await Promise.all(getIndexPatternPromises);
  };

  /**
   * Gets list of index pattern ids with titles.
   * @param refresh Force refresh of index pattern list
   */
  getIdsWithTitle = async (refresh: boolean = false): Promise<DataViewListItem[]> => {
    if (!this.savedObjectsCache || refresh) {
      await this.refreshSavedObjectsCache();
    }
    if (!this.savedObjectsCache) {
      return [];
    }
    return this.savedObjectsCache.map((obj) => ({
      id: obj?.id,
      namespaces: obj?.namespaces,
      title: obj?.attributes?.title,
      type: obj?.attributes?.type,
      typeMeta: obj?.attributes?.typeMeta && JSON.parse(obj?.attributes?.typeMeta),
      name: obj?.attributes?.name,
    }));
  };

  /**
   * Clear index pattern saved objects cache.
   */
  clearCache = () => {
    this.savedObjectsCache = null;
  };

  /**
   * Clear index pattern instance cache
   */
  clearInstanceCache = (id?: string) => {
    if (id) {
      this.dataViewCache.clear(id);
    } else {
      this.dataViewCache.clearAll();
    }
  };

  /**
   * Get cache, contains data view saved objects.
   */

  getCache = async () => {
    if (!this.savedObjectsCache) {
      await this.refreshSavedObjectsCache();
    }
    return this.savedObjectsCache;
  };

  /**
   * Get default index pattern
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */
  getDefault = async (displayErrors: boolean = true) => {
    const defaultIndexPatternId = await this.getDefaultId();
    if (defaultIndexPatternId) {
      return await this.get(defaultIndexPatternId, displayErrors);
    }

    return null;
  };

  /**
   * Get default index pattern id
   */
  getDefaultId = async (): Promise<string | null> => {
    const defaultIndexPatternId = await this.config.get<string | null>('defaultIndex');
    return defaultIndexPatternId ?? null;
  };

  /**
   * Optionally set default index pattern, unless force = true
   * @param id data view id
   * @param force set default data view even if there's an existing default
   */
  setDefault = async (id: string | null, force = false) => {
    if (force || !(await this.config.get('defaultIndex'))) {
      await this.config.set('defaultIndex', id);
    }
  };

  /**
   * Checks if current user has a user created index pattern ignoring fleet's server default index patterns.
   */
  async hasUserDataView(): Promise<boolean> {
    return this.apiClient.hasUserDataView();
  }

  /**
   * Get field list by providing { pattern }.
   * @param options options for getting field list
   * @returns FieldSpec[]
   */
  getFieldsForWildcard = async (options: GetFieldsOptions): Promise<FieldSpec[]> => {
    const metaFields = await this.config.get<string[]>(META_FIELDS);
    const { fields } = await this.apiClient.getFieldsForWildcard({
      ...options,
      metaFields,
    });
    return fields;
  };

  /**
   * Get field list by providing an index patttern (or spec).
   * @param options options for getting field list
   * @returns FieldSpec[]
   */
  getFieldsForIndexPattern = async (
    indexPattern: DataView | DataViewSpec,
    options?: Omit<GetFieldsOptions, 'pattern'>
  ) =>
    this.getFieldsForWildcard({
      type: indexPattern.type,
      rollupIndex: indexPattern?.typeMeta?.params?.rollup_index,
      allowNoIndex: indexPattern.allowNoIndex,
      ...options,
      pattern: indexPattern.title as string,
    });

  private getFieldsAndIndicesForDataView = async (dataView: DataView) => {
    const metaFields = await this.config.get<string[]>(META_FIELDS);
    return this.apiClient.getFieldsForWildcard({
      type: dataView.type,
      rollupIndex: dataView?.typeMeta?.params?.rollup_index,
      allowNoIndex: dataView.allowNoIndex,
      pattern: dataView.getIndexPattern(),
      metaFields,
    });
  };

  private getFieldsAndIndicesForWildcard = async (options: GetFieldsOptions) => {
    const metaFields = await this.config.get<string[]>(META_FIELDS);
    return await this.apiClient.getFieldsForWildcard({
      pattern: options.pattern,
      metaFields,
      type: options.type,
      rollupIndex: options.rollupIndex,
      allowNoIndex: options.allowNoIndex,
      indexFilter: options.indexFilter,
    });
  };

  private refreshFieldsFn = async (indexPattern: DataView) => {
    const { fields, indices } = await this.getFieldsAndIndicesForDataView(indexPattern);
    fields.forEach((field) => (field.isMapped = true));
    const scripted = indexPattern.getScriptedFields().map((field) => field.spec);
    const fieldAttrs = indexPattern.getFieldAttrs();
    const fieldsWithSavedAttrs = Object.values(
      this.fieldArrayToMap([...fields, ...scripted], fieldAttrs)
    );
    const runtimeFieldsMap = this.getRuntimeFields(
      indexPattern.getRuntimeMappings() as Record<string, RuntimeFieldSpec>,
      indexPattern.getFieldAttrs()
    );
    const runtimeFieldsArray = Object.values(runtimeFieldsMap).filter(
      (runtimeField) =>
        !fieldsWithSavedAttrs.find((mappedField) => mappedField.name === runtimeField.name)
    );
    indexPattern.fields.replaceAll([...runtimeFieldsArray, ...fieldsWithSavedAttrs]);
    indexPattern.matchedIndices = indices;
  };

  /**
   * Refresh field list for a given index pattern.
   * @param indexPattern
   * @param displayErrors  - If set false, API consumer is responsible for displaying and handling errors.
   */
  refreshFields = async (dataView: DataView, displayErrors: boolean = true) => {
    if (!displayErrors) {
      return this.refreshFieldsFn(dataView);
    }

    try {
      await this.refreshFieldsFn(dataView);
    } catch (err) {
      if (err instanceof DataViewMissingIndices) {
        this.onNotification(
          { title: err.message, color: 'danger', iconType: 'alert' },
          `refreshFields:${dataView.getIndexPattern()}`
        );
      }

      this.onError(
        err,
        {
          title: i18n.translate('dataViews.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields for data view {title} (ID: {id})',
            values: { id: dataView.id, title: dataView.getIndexPattern() },
          }),
        },
        dataView.getIndexPattern()
      );
    }
  };

  /**
   * Refreshes a field list from a spec before an index pattern instance is created.
   * @param fields
   * @param id
   * @param title
   * @param options
   * @returns Record<string, FieldSpec>
   */
  private refreshFieldSpecMap = async (
    fields: DataViewFieldMap,
    id: string,
    title: string,
    options: GetFieldsOptions,
    fieldAttrs: FieldAttrs = {}
  ) => {
    const fieldsAsArr = Object.values(fields);
    const scriptedFields = fieldsAsArr.filter((field) => field.scripted);
    try {
      let updatedFieldList: FieldSpec[];
      const { fields: newFields, indices } = await this.getFieldsAndIndicesForWildcard(options);
      newFields.forEach((field) => (field.isMapped = true));

      // If allowNoIndex, only update field list if field caps finds fields. To support
      // beats creating index pattern and dashboard before docs
      if (!options.allowNoIndex || (newFields && newFields.length > 5)) {
        updatedFieldList = [...newFields, ...scriptedFields];
      } else {
        updatedFieldList = fieldsAsArr;
      }

      return { fields: this.fieldArrayToMap(updatedFieldList, fieldAttrs), indices };
    } catch (err) {
      if (err instanceof DataViewMissingIndices) {
        this.onNotification(
          { title: err.message, color: 'danger', iconType: 'alert' },
          `refreshFieldSpecMap:${title}`
        );
        return {};
      }

      this.onError(
        err,
        {
          title: i18n.translate('dataViews.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields for data view {title} (ID: {id})',
            values: { id, title },
          }),
        },
        title
      );
      throw err;
    }
  };

  /**
   * Converts field array to map.
   * @param fields: FieldSpec[]
   * @param fieldAttrs: FieldAttrs
   * @returns Record<string, FieldSpec>
   */
  fieldArrayToMap = (fields: FieldSpec[], fieldAttrs?: FieldAttrs) =>
    fields.reduce<DataViewFieldMap>((collector, field) => {
      collector[field.name] = {
        ...field,
        customLabel: fieldAttrs?.[field.name]?.customLabel,
        count: fieldAttrs?.[field.name]?.count,
      };
      return collector;
    }, {});

  /**
   * Converts data view saved object to data view spec.
   * @param savedObject
   * @returns DataViewSpec
   */

  savedObjectToSpec = (savedObject: SavedObject<DataViewAttributes>): DataViewSpec => {
    const {
      id,
      version,
      namespaces,
      attributes: {
        title,
        timeFieldName,
        fields,
        sourceFilters,
        fieldFormatMap,
        runtimeFieldMap,
        typeMeta,
        type,
        fieldAttrs,
        allowNoIndex,
        name,
      },
    } = savedObject;

    const parsedSourceFilters = sourceFilters ? JSON.parse(sourceFilters) : undefined;
    const parsedTypeMeta = typeMeta ? JSON.parse(typeMeta) : undefined;
    const parsedFieldFormatMap = fieldFormatMap ? JSON.parse(fieldFormatMap) : {};
    const parsedFields: FieldSpec[] = fields ? JSON.parse(fields) : [];
    const parsedFieldAttrs: FieldAttrs = fieldAttrs ? JSON.parse(fieldAttrs) : {};
    const parsedRuntimeFieldMap: Record<string, RuntimeField> = runtimeFieldMap
      ? JSON.parse(runtimeFieldMap)
      : {};

    return {
      id,
      version,
      namespaces,
      title,
      timeFieldName,
      sourceFilters: parsedSourceFilters,
      fields: this.fieldArrayToMap(parsedFields, parsedFieldAttrs),
      typeMeta: parsedTypeMeta,
      type,
      fieldFormats: parsedFieldFormatMap,
      fieldAttrs: parsedFieldAttrs,
      allowNoIndex,
      runtimeFieldMap: parsedRuntimeFieldMap,
      name,
    };
  };

  private getSavedObjectAndInit = async (
    id: string,
    displayErrors: boolean = true
  ): Promise<DataView> => {
    const savedObject = await this.savedObjectsClient.get<DataViewAttributes>(
      DATA_VIEW_SAVED_OBJECT_TYPE,
      id
    );

    if (!savedObject.version) {
      throw new SavedObjectNotFound('data view', id, 'management/kibana/dataViews');
    }

    return this.initFromSavedObject(savedObject, displayErrors);
  };

  private initFromSavedObjectLoadFields = async ({
    savedObjectId,
    spec,
  }: {
    savedObjectId: string;
    spec: DataViewSpec;
  }) => {
    const { title, type, typeMeta, runtimeFieldMap } = spec;
    const { fields, indices } = await this.refreshFieldSpecMap(
      spec.fields || {},
      savedObjectId,
      spec.title as string,
      {
        pattern: title as string,
        metaFields: await this.config.get(META_FIELDS),
        type,
        rollupIndex: typeMeta?.params?.rollup_index,
        allowNoIndex: spec.allowNoIndex,
      },
      spec.fieldAttrs
    );

    const runtimeFieldSpecs = this.getRuntimeFields(runtimeFieldMap, spec.fieldAttrs);
    // mapped fields overwrite runtime fields
    return { fields: { ...runtimeFieldSpecs, ...fields }, indices: indices || [] };
  };

  private initFromSavedObject = async (
    savedObject: SavedObject<DataViewAttributes>,
    displayErrors: boolean = true
  ): Promise<DataView> => {
    const spec = this.savedObjectToSpec(savedObject);
    spec.fieldAttrs = savedObject.attributes.fieldAttrs
      ? JSON.parse(savedObject.attributes.fieldAttrs)
      : {};

    let fields: Record<string, FieldSpec> = {};
    let indices: string[] = [];

    if (!displayErrors) {
      const fieldsAndIndices = await this.initFromSavedObjectLoadFields({
        savedObjectId: savedObject.id,
        spec,
      });
      fields = fieldsAndIndices.fields;
      indices = fieldsAndIndices.indices;
    } else {
      try {
        const fieldsAndIndices = await this.initFromSavedObjectLoadFields({
          savedObjectId: savedObject.id,
          spec,
        });
        fields = fieldsAndIndices.fields;
        indices = fieldsAndIndices.indices;
      } catch (err) {
        if (err instanceof DataViewMissingIndices) {
          this.onNotification(
            {
              title: err.message,
              color: 'danger',
              iconType: 'alert',
            },
            `initFromSavedObject:${spec.title}`
          );
        } else {
          this.onError(
            err,
            {
              title: i18n.translate('dataViews.fetchFieldErrorTitle', {
                defaultMessage: 'Error fetching fields for data view {title} (ID: {id})',
                values: { id: savedObject.id, title: spec.title },
              }),
            },
            spec.title || ''
          );
        }
      }
    }

    spec.fields = fields;
    spec.fieldFormats = savedObject.attributes.fieldFormatMap
      ? JSON.parse(savedObject.attributes.fieldFormatMap)
      : {};

    const indexPattern = await this.createFromSpec(spec, true, displayErrors);
    indexPattern.matchedIndices = indices;
    indexPattern.resetOriginalSavedObjectBody();
    return indexPattern;
  };

  private getRuntimeFields = (
    runtimeFieldMap: Record<string, RuntimeFieldSpec> | undefined = {},
    fieldAttrs: FieldAttrs | undefined = {}
  ) => {
    const spec: DataViewFieldMap = {};

    const addRuntimeFieldToSpecFields = (
      name: string,
      fieldType: RuntimeType,
      runtimeField: RuntimeFieldSpec,
      parentName?: string
    ) => {
      spec[name] = {
        name,
        type: castEsToKbnFieldTypeName(fieldType),
        esTypes: [fieldType],
        runtimeField,
        aggregatable: true,
        searchable: true,
        readFromDocValues: false,
        customLabel: fieldAttrs?.[name]?.customLabel,
        count: fieldAttrs?.[name]?.count,
      };

      if (parentName) {
        spec[name].parentName = parentName;
      }
    };

    // CREATE RUNTIME FIELDS
    for (const [name, runtimeField] of Object.entries(runtimeFieldMap || {})) {
      // For composite runtime field we add the subFields, **not** the composite
      if (runtimeField.type === 'composite') {
        Object.entries(runtimeField.fields!).forEach(([subFieldName, subField]) => {
          addRuntimeFieldToSpecFields(`${name}.${subFieldName}`, subField.type, runtimeField, name);
        });
      } else {
        addRuntimeFieldToSpecFields(name, runtimeField.type, runtimeField);
      }
    }

    return spec;
  };

  /**
   * Get an index pattern by id, cache optimized.
   * @param id
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   * @param refreshFields - If set true, will fetch fields from the index pattern
   */
  get = async (
    id: string,
    displayErrors: boolean = true,
    refreshFields = false
  ): Promise<DataView> => {
    const dataViewFromCache = this.dataViewCache.get(id)?.then(async (dataView) => {
      if (dataView && refreshFields) {
        await this.refreshFields(dataView);
      }
      return dataView;
    });

    const indexPatternPromise =
      dataViewFromCache ||
      this.dataViewCache.set(id, this.getSavedObjectAndInit(id, displayErrors));

    // don't cache failed requests
    indexPatternPromise.catch(() => {
      this.dataViewCache.clear(id);
    });

    return indexPatternPromise;
  };

  /**
   * Create a new data view instance.
   * @param spec data view spec
   * @param skipFetchFields if true, will not fetch fields
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   * @returns DataView
   */
  private async createFromSpec(
    { id, name, title, ...restOfSpec }: DataViewSpec,
    skipFetchFields = false,
    displayErrors = true
  ): Promise<DataView> {
    const shortDotsEnable = await this.config.get<boolean>(FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get<string[] | undefined>(META_FIELDS);

    const spec = {
      id: id ?? uuidv4(),
      title,
      name: name || title,
      ...restOfSpec,
    };

    const dataView = new DataView({
      spec,
      fieldFormats: this.fieldFormats,
      shortDotsEnable,
      metaFields,
    });

    if (!skipFetchFields) {
      await this.refreshFields(dataView, displayErrors);
    }

    return dataView;
  }

  /**
   * Create data view instance.
   * @param spec data view spec
   * @param skipFetchFields if true, will not fetch fields
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   * @returns DataView
   */
  async create(
    spec: DataViewSpec,
    skipFetchFields = false,
    displayErrors = true
  ): Promise<DataView> {
    const doCreate = () => this.createFromSpec(spec, skipFetchFields, displayErrors);

    if (spec.id) {
      const cachedDataView = this.dataViewCache.get(spec.id);

      if (cachedDataView) {
        return cachedDataView;
      }

      return this.dataViewCache.set(spec.id, doCreate());
    }

    const dataView = await doCreate();
    return this.dataViewCache.set(dataView.id!, Promise.resolve(dataView));
  }

  /**
   * Create a new data view and save it right away.
   * @param spec data view spec
   * @param override Overwrite if existing index pattern exists.
   * @param skipFetchFields Whether to skip field refresh step.
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */

  async createAndSave(
    spec: DataViewSpec,
    override = false,
    skipFetchFields = false,
    displayErrors = true
  ) {
    const indexPattern = await this.createFromSpec(spec, skipFetchFields, displayErrors);
    const createdIndexPattern = await this.createSavedObject(indexPattern, override, displayErrors);
    await this.setDefault(createdIndexPattern.id!);
    return createdIndexPattern!;
  }

  /**
   * Save a new data view.
   * @param dataView data view instance
   * @param override Overwrite if existing index pattern exists
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */

  async createSavedObject(dataView: DataView, override = false, displayErrors = true) {
    if (!(await this.getCanSave())) {
      throw new DataViewInsufficientAccessError();
    }
    const dupe = await findByName(this.savedObjectsClient, dataView.getName());

    if (dupe) {
      if (override) {
        await this.delete(dupe.id);
      } else {
        throw new DuplicateDataViewError(`Duplicate data view: ${dataView.getName()}`);
      }
    }

    const body = dataView.getAsSavedObjectBody();
    const response: SavedObject<DataViewAttributes> = (await this.savedObjectsClient.create(
      DATA_VIEW_SAVED_OBJECT_TYPE,
      body,
      {
        id: dataView.id,
      }
    )) as SavedObject<DataViewAttributes>;

    const createdIndexPattern = await this.initFromSavedObject(response, displayErrors);
    if (this.savedObjectsCache) {
      this.savedObjectsCache.push(response as SavedObject<IndexPatternListSavedObjectAttrs>);
    }
    return createdIndexPattern;
  }

  /**
   * Save existing data view. Will attempt to merge differences if there are conflicts.
   * @param indexPattern
   * @param saveAttempts
   * @param ignoreErrors
   * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
   */

  async updateSavedObject(
    indexPattern: DataView,
    saveAttempts: number = 0,
    ignoreErrors: boolean = false,
    displayErrors: boolean = true
  ): Promise<DataView | void | Error> {
    if (!indexPattern.id) return;
    if (!(await this.getCanSave())) {
      throw new DataViewInsufficientAccessError(indexPattern.id);
    }

    // get the list of attributes
    const body = indexPattern.getAsSavedObjectBody();
    const originalBody = indexPattern.getOriginalSavedObjectBody();

    // get changed keys
    const originalChangedKeys: string[] = [];
    Object.entries(body).forEach(([key, value]) => {
      const realKey = key as keyof typeof originalBody;
      if (value !== originalBody[realKey]) {
        originalChangedKeys.push(key);
      }
    });

    return this.savedObjectsClient
      .update(DATA_VIEW_SAVED_OBJECT_TYPE, indexPattern.id, body, {
        version: indexPattern.version,
      })
      .then((response) => {
        indexPattern.id = response.id;
        indexPattern.version = response.version;
        return indexPattern;
      })
      .catch(async (err) => {
        if (err?.response?.status === 409 && saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS) {
          const samePattern = await this.get(indexPattern.id as string, displayErrors);
          // What keys changed from now and what the server returned
          const updatedBody = samePattern.getAsSavedObjectBody();

          // Build a list of changed keys from the server response
          // and ensure we ignore the key if the server response
          // is the same as the original response (since that is expected
          // if we made a change in that key)

          const serverChangedKeys: string[] = [];
          Object.entries(updatedBody).forEach(([key, value]) => {
            const realKey = key as keyof typeof originalBody;
            if (value !== body[realKey] && value !== originalBody[realKey]) {
              serverChangedKeys.push(key);
            }
          });

          let unresolvedCollision = false;
          for (const originalKey of originalChangedKeys) {
            for (const serverKey of serverChangedKeys) {
              if (originalKey === serverKey) {
                unresolvedCollision = true;
                break;
              }
            }
          }

          if (unresolvedCollision) {
            if (ignoreErrors) {
              return;
            }
            const title = i18n.translate('dataViews.unableWriteLabel', {
              defaultMessage:
                'Unable to write data view! Refresh the page to get the most up to date changes for this data view.',
            });

            if (displayErrors) {
              this.onNotification(
                { title, color: 'danger' },
                `updateSavedObject:${indexPattern.getIndexPattern()}`
              );
            }
            throw err;
          }

          // Set the updated response on this object
          serverChangedKeys.forEach((key) => {
            // FIXME: this overwrites read-only properties
            (indexPattern as any)[key] = (samePattern as any)[key];
          });
          indexPattern.version = samePattern.version;

          // Clear cache
          this.dataViewCache.clear(indexPattern.id!);

          // Try the save again
          return this.updateSavedObject(indexPattern, saveAttempts, ignoreErrors, displayErrors);
        }
        throw err;
      });
  }

  /**
   * Deletes an index pattern from .kibana index.
   * @param indexPatternId: Id of kibana Index Pattern to delete
   */
  async delete(indexPatternId: string) {
    if (!(await this.getCanSave())) {
      throw new DataViewInsufficientAccessError(indexPatternId);
    }
    this.dataViewCache.clear(indexPatternId);
    return this.savedObjectsClient.delete(DATA_VIEW_SAVED_OBJECT_TYPE, indexPatternId);
  }

  /**
   * Returns the default data view as an object.
   * If no default is found, or it is missing
   * another data view is selected as default and returned.
   * If no possible data view found to become a default returns null.
   *
   * @param {boolean} refreshFields - if true, will refresh the fields of the default data view
   * @returns default data view
   */
  async getDefaultDataView(refreshFields?: boolean): Promise<DataView | null> {
    const patterns = await this.getIdsWithTitle();
    let defaultId: string | undefined = await this.config.get('defaultIndex');
    const exists = defaultId ? patterns.some((pattern) => pattern.id === defaultId) : false;

    if (defaultId && !exists) {
      if (await this.getCanSaveAdvancedSettings()) {
        await this.config.remove('defaultIndex');
      }

      defaultId = undefined;
    }

    if (!defaultId && patterns.length >= 1 && (await this.hasUserDataView().catch(() => true))) {
      defaultId = patterns[0].id;
      if (await this.getCanSaveAdvancedSettings()) {
        await this.config.set('defaultIndex', defaultId);
      }
    }

    if (defaultId) {
      return this.get(defaultId, undefined, refreshFields);
    } else {
      return null;
    }
  }
}

/**
 * Data views service interface
 * @public
 */

export type DataViewsContract = PublicMethodsOf<DataViewsService>;
