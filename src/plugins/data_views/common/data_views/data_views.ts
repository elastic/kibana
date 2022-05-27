/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
import { PublicMethodsOf } from '@kbn/utility-types';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { FieldFormatsStartCommon, FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE, DEFAULT_ASSETS_TO_IGNORE } from '..';
import { SavedObjectsClientCommon } from '../types';

import { createDataViewCache } from '.';
import type { RuntimeField, RuntimeFieldSpec, RuntimeType } from '../types';
import { DataView } from './data_view';
import { createEnsureDefaultDataView, EnsureDefaultDataView } from './ensure_default_data_view';
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
import { findByTitle } from '../utils';
import { DuplicateDataViewError, DataViewInsufficientAccessError } from '../errors';

const MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS = 3;

export type IndexPatternSavedObjectAttrs = Pick<DataViewAttributes, 'title' | 'type' | 'typeMeta'>;

export type IndexPatternListSavedObjectAttrs = Pick<
  DataViewAttributes,
  'title' | 'type' | 'typeMeta'
>;

export interface DataViewListItem {
  id: string;
  namespaces?: string[];
  title: string;
  type?: string;
  typeMeta?: TypeMeta;
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
   * Hander for service notifications
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
}

export interface DataViewsServicePublicMethods {
  /**
   * Clear the cache of data views.
   */
  clearCache: (id?: string | undefined) => void;
  /**
   * Create data view based on the provided spec.
   * @param spec - Data view spec.
   * @param skipFetchFields - If true, do not fetch fields.
   */
  create: (spec: DataViewSpec, skipFetchFields?: boolean) => Promise<DataView>;
  /**
   * Create and save data view based on provided spec.
   * @param spec - Data view spec.
   * @param override - If true, save over existing data view
   * @param skipFetchFields - If true, do not fetch fields.
   */
  createAndSave: (
    spec: DataViewSpec,
    override?: boolean,
    skipFetchFields?: boolean
  ) => Promise<DataView>;
  /**
   * Save data view.
   * @param dataView - Data view instance to save.
   * @param override - If true, save over existing data view
   */
  createSavedObject: (indexPattern: DataView, override?: boolean) => Promise<DataView>;
  /**
   * Delete data view.
   * @param indexPatternId - Id of the data view to delete.
   */
  delete: (indexPatternId: string) => Promise<{}>;
  /**
   * @deprecated Use `getDefaultDataView` instead (when loading data view) and handle
   *             'no data view' case in api consumer code - no more auto redirect
   */
  ensureDefaultDataView: EnsureDefaultDataView;
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
   */
  get: (id: string) => Promise<DataView>;
  /**
   * Get populated data view saved object cache
   */
  getCache: () => Promise<Array<SavedObject<IndexPatternSavedObjectAttrs>> | null | undefined>;
  /**
   * If user can save data view, return true.
   */
  getCanSave: () => Promise<boolean>;
  /**
   * Get default data view as data view instance.
   */
  getDefault: () => Promise<DataView | null>;
  /**
   * Get default data view id.
   */
  getDefaultId: () => Promise<string | null>;
  /**
   * Get default data view, if it doesn't exist, choose and save new default data view and return it.
   */
  getDefaultDataView: () => Promise<DataView | null>;
  /**
   * Get fields for data view
   * @param dataView - Data view instance or spec
   * @param options - Options for getting fields
   * @returns FieldSpec array
   */
  getFieldsForIndexPattern: (
    indexPattern: DataView | DataViewSpec,
    options?: GetFieldsOptions | undefined
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
   */
  getTitles: (refresh?: boolean) => Promise<string[]>;
  /**
   * Returns true if user has access to view a data view.
   */
  hasUserDataView: () => Promise<boolean>;
  refreshFields: (indexPattern: DataView) => Promise<void>;
  savedObjectToSpec: (savedObject: SavedObject<DataViewAttributes>) => DataViewSpec;
  setDefault: (id: string | null, force?: boolean) => Promise<void>;
  updateSavedObject: (
    indexPattern: DataView,
    saveAttempts?: number,
    ignoreErrors?: boolean
  ) => Promise<void | Error>;
}

/**
 * Data views service, providing CRUD operations for data views.
 */
export class DataViewsService {
  private config: UiSettingsCommon;
  private savedObjectsClient: SavedObjectsClientCommon;
  private savedObjectsCache?: Array<SavedObject<IndexPatternSavedObjectAttrs>> | null;
  private apiClient: IDataViewsApiClient;
  private fieldFormats: FieldFormatsStartCommon;
  /**
   *  Handler for service notifications
   * @param toastInputFields notification content in toast format
   * @param key used to indicate uniqueness of the notification
   */
  private onNotification: OnNotification;
  /*
   *   Handler for service errors
   * @param error notification content in toast format
   * @param key used to indicate uniqueness of the error
   */
  private onError: OnError;
  private dataViewCache: ReturnType<typeof createDataViewCache>;
  public getCanSave: () => Promise<boolean>;

  /**
   * @deprecated Use `getDefaultDataView` instead (when loading data view) and handle
   *             'no data view' case in api consumer code - no more auto redirect
   */
  ensureDefaultDataView: EnsureDefaultDataView;

  constructor({
    uiSettings,
    savedObjectsClient,
    apiClient,
    fieldFormats,
    onNotification,
    onError,
    onRedirectNoIndexPattern = () => {},
    getCanSave = () => Promise.resolve(false),
  }: DataViewsServiceDeps) {
    this.apiClient = apiClient;
    this.config = uiSettings;
    this.savedObjectsClient = savedObjectsClient;
    this.fieldFormats = fieldFormats;
    this.onNotification = onNotification;
    this.onError = onError;
    this.ensureDefaultDataView = createEnsureDefaultDataView(uiSettings, onRedirectNoIndexPattern);
    this.getCanSave = getCanSave;

    this.dataViewCache = createDataViewCache();
  }

  /**
   * Refresh cache of index pattern ids and titles
   */
  private async refreshSavedObjectsCache() {
    const so = await this.savedObjectsClient.find<IndexPatternSavedObjectAttrs>({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      fields: ['title', 'type', 'typeMeta'],
      perPage: 10000,
    });
    this.savedObjectsCache = so;
  }

  /**
   * Get list of index pattern ids
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
   * Get list of index pattern titles
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
   * Find and load index patterns by title
   * @param search Search string
   * @param size  Number of data views to return
   * @returns DataView[]
   */
  find = async (search: string, size: number = 10): Promise<DataView[]> => {
    const savedObjects = await this.savedObjectsClient.find<IndexPatternSavedObjectAttrs>({
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
   * Get list of index pattern ids with titles
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
    }));
  };

  /**
   * Clear index pattern list cache
   * @param id optionally clear a single id
   */
  clearCache = (id?: string) => {
    this.savedObjectsCache = null;
    if (id) {
      this.dataViewCache.clear(id);
    } else {
      this.dataViewCache.clearAll();
    }
  };

  /**
   * Get cache. Contains dat  view saved objects
   */

  getCache = async () => {
    if (!this.savedObjectsCache) {
      await this.refreshSavedObjectsCache();
    }
    return this.savedObjectsCache;
  };

  /**
   * Get default index pattern
   */
  getDefault = async () => {
    const defaultIndexPatternId = await this.getDefaultId();
    if (defaultIndexPatternId) {
      return await this.get(defaultIndexPatternId);
    }

    return null;
  };

  /**
   * Get default index pattern id
   */
  getDefaultId = async (): Promise<string | null> => {
    const defaultIndexPatternId = await this.config.get('defaultIndex');
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
   * Checks if current user has a user created index pattern ignoring fleet's server default index patterns
   */
  async hasUserDataView(): Promise<boolean> {
    return this.apiClient.hasUserIndexPattern();
  }

  /**
   * Get field list by providing { pattern }
   * @param options options for getting field list
   * @returns FieldSpec[]
   */
  getFieldsForWildcard = async (options: GetFieldsOptions): Promise<FieldSpec[]> => {
    const metaFields = await this.config.get(META_FIELDS);
    return this.apiClient.getFieldsForWildcard({
      pattern: options.pattern,
      metaFields,
      type: options.type,
      rollupIndex: options.rollupIndex,
      allowNoIndex: options.allowNoIndex,
      filter: options.filter,
    });
  };

  /**
   * Get field list by providing an index patttern (or spec)
   * @param options options for getting field list
   * @returns FieldSpec[]
   */
  getFieldsForIndexPattern = async (
    indexPattern: DataView | DataViewSpec,
    options?: GetFieldsOptions
  ) =>
    this.getFieldsForWildcard({
      type: indexPattern.type,
      rollupIndex: indexPattern?.typeMeta?.params?.rollup_index,
      ...options,
      pattern: indexPattern.title as string,
    });

  /**
   * Refresh field list for a given index pattern
   * @param indexPattern
   */
  refreshFields = async (indexPattern: DataView) => {
    try {
      const fields = (await this.getFieldsForIndexPattern(indexPattern)) as FieldSpec[];
      fields.forEach((field) => (field.isMapped = true));
      const scripted = indexPattern.getScriptedFields().map((field) => field.spec);
      const fieldAttrs = indexPattern.getFieldAttrs();
      const fieldsWithSavedAttrs = Object.values(
        this.fieldArrayToMap([...fields, ...scripted], fieldAttrs)
      );
      indexPattern.fields.replaceAll(fieldsWithSavedAttrs);
    } catch (err) {
      if (err instanceof DataViewMissingIndices) {
        this.onNotification(
          { title: err.message, color: 'danger', iconType: 'alert' },
          `refreshFields:${indexPattern.title}`
        );
      }

      this.onError(
        err,
        {
          title: i18n.translate('dataViews.fetchFieldErrorTitle', {
            defaultMessage: 'Error fetching fields for data view {title} (ID: {id})',
            values: { id: indexPattern.id, title: indexPattern.title },
          }),
        },
        indexPattern.title
      );
    }
  };

  /**
   * Refreshes a field list from a spec before an index pattern instance is created
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
      const newFields = (await this.getFieldsForWildcard(options)) as FieldSpec[];
      newFields.forEach((field) => (field.isMapped = true));

      // If allowNoIndex, only update field list if field caps finds fields. To support
      // beats creating index pattern and dashboard before docs
      if (!options.allowNoIndex || (newFields && newFields.length > 5)) {
        updatedFieldList = [...newFields, ...scriptedFields];
      } else {
        updatedFieldList = fieldsAsArr;
      }

      return this.fieldArrayToMap(updatedFieldList, fieldAttrs);
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
   * Converts field array to map
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
   * Converts index pattern saved object to index pattern spec
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
    };
  };

  private getSavedObjectAndInit = async (id: string): Promise<DataView> => {
    const savedObject = await this.savedObjectsClient.get<DataViewAttributes>(
      DATA_VIEW_SAVED_OBJECT_TYPE,
      id
    );

    if (!savedObject.version) {
      throw new SavedObjectNotFound('data view', id, 'management/kibana/dataViews');
    }

    return this.initFromSavedObject(savedObject);
  };

  private initFromSavedObject = async (
    savedObject: SavedObject<DataViewAttributes>
  ): Promise<DataView> => {
    const spec = this.savedObjectToSpec(savedObject);
    const { title, type, typeMeta, runtimeFieldMap } = spec;
    spec.fieldAttrs = savedObject.attributes.fieldAttrs
      ? JSON.parse(savedObject.attributes.fieldAttrs)
      : {};

    try {
      spec.fields = await this.refreshFieldSpecMap(
        spec.fields || {},
        savedObject.id,
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

      const addRuntimeFieldToSpecFields = (
        name: string,
        fieldType: RuntimeType,
        runtimeField: RuntimeFieldSpec
      ) => {
        spec.fields![name] = {
          name,
          type: castEsToKbnFieldTypeName(fieldType),
          esTypes: [fieldType],
          runtimeField,
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
          customLabel: spec.fieldAttrs?.[name]?.customLabel,
          count: spec.fieldAttrs?.[name]?.count,
        };
      };

      // CREATE RUNTIME FIELDS
      for (const [name, runtimeField] of Object.entries(runtimeFieldMap || {})) {
        // do not create runtime field if mapped field exists
        if (!spec.fields[name]) {
          // For composite runtime field we add the subFields, **not** the composite
          if (runtimeField.type === 'composite') {
            Object.entries(runtimeField.fields!).forEach(([subFieldName, subField]) => {
              addRuntimeFieldToSpecFields(`${name}.${subFieldName}`, subField.type, runtimeField);
            });
          } else {
            addRuntimeFieldToSpecFields(name, runtimeField.type, runtimeField);
          }
        }
      }
    } catch (err) {
      if (err instanceof DataViewMissingIndices) {
        this.onNotification(
          {
            title: err.message,
            color: 'danger',
            iconType: 'alert',
          },
          `initFromSavedObject:${title}`
        );
      } else {
        this.onError(
          err,
          {
            title: i18n.translate('dataViews.fetchFieldErrorTitle', {
              defaultMessage: 'Error fetching fields for data view {title} (ID: {id})',
              values: { id: savedObject.id, title },
            }),
          },
          title || ''
        );
      }
    }

    spec.fieldFormats = savedObject.attributes.fieldFormatMap
      ? JSON.parse(savedObject.attributes.fieldFormatMap)
      : {};

    const indexPattern = await this.create(spec, true);
    indexPattern.resetOriginalSavedObjectBody();
    return indexPattern;
  };

  /**
   * Get an index pattern by id. Cache optimized
   * @param id
   */

  get = async (id: string): Promise<DataView> => {
    const indexPatternPromise =
      this.dataViewCache.get(id) || this.dataViewCache.set(id, this.getSavedObjectAndInit(id));

    // don't cache failed requests
    indexPatternPromise.catch(() => {
      this.dataViewCache.clear(id);
    });

    return indexPatternPromise;
  };

  /**
   * Create a new index pattern instance
   * @param spec
   * @param skipFetchFields
   * @returns IndexPattern
   */
  async create(spec: DataViewSpec, skipFetchFields = false): Promise<DataView> {
    const shortDotsEnable = await this.config.get(FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE);
    const metaFields = await this.config.get(META_FIELDS);

    const indexPattern = new DataView({
      spec,
      fieldFormats: this.fieldFormats,
      shortDotsEnable,
      metaFields,
    });

    if (!skipFetchFields) {
      await this.refreshFields(indexPattern);
    }

    return indexPattern;
  }

  /**
   * Create a new index pattern and save it right away
   * @param spec
   * @param override Overwrite if existing index pattern exists.
   * @param skipFetchFields Whether to skip field refresh step.
   */

  async createAndSave(spec: DataViewSpec, override = false, skipFetchFields = false) {
    const indexPattern = await this.create(spec, skipFetchFields);
    const createdIndexPattern = await this.createSavedObject(indexPattern, override);
    await this.setDefault(createdIndexPattern.id!);
    return createdIndexPattern!;
  }

  /**
   * Save a new index pattern
   * @param indexPattern
   * @param override Overwrite if existing index pattern exists
   */

  async createSavedObject(indexPattern: DataView, override = false) {
    if (!(await this.getCanSave())) {
      throw new DataViewInsufficientAccessError();
    }
    const dupe = await findByTitle(this.savedObjectsClient, indexPattern.title);
    if (dupe) {
      if (override) {
        await this.delete(dupe.id);
      } else {
        throw new DuplicateDataViewError(`Duplicate index pattern: ${indexPattern.title}`);
      }
    }

    const body = indexPattern.getAsSavedObjectBody();
    const response: SavedObject<DataViewAttributes> = (await this.savedObjectsClient.create(
      DATA_VIEW_SAVED_OBJECT_TYPE,
      body,
      {
        id: indexPattern.id,
      }
    )) as SavedObject<DataViewAttributes>;

    const createdIndexPattern = await this.initFromSavedObject(response);
    this.dataViewCache.set(createdIndexPattern.id!, Promise.resolve(createdIndexPattern));
    if (this.savedObjectsCache) {
      this.savedObjectsCache.push(response as SavedObject<IndexPatternListSavedObjectAttrs>);
    }
    return createdIndexPattern;
  }

  /**
   * Save existing index pattern. Will attempt to merge differences if there are conflicts
   * @param indexPattern
   * @param saveAttempts
   */

  async updateSavedObject(
    indexPattern: DataView,
    saveAttempts: number = 0,
    ignoreErrors: boolean = false
  ): Promise<void | Error> {
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
      if (value !== (originalBody as any)[key]) {
        originalChangedKeys.push(key);
      }
    });

    return this.savedObjectsClient
      .update(DATA_VIEW_SAVED_OBJECT_TYPE, indexPattern.id, body, {
        version: indexPattern.version,
      })
      .then((resp) => {
        indexPattern.id = resp.id;
        indexPattern.version = resp.version;
      })
      .catch(async (err) => {
        if (err?.res?.status === 409 && saveAttempts++ < MAX_ATTEMPTS_TO_RESOLVE_CONFLICTS) {
          const samePattern = await this.get(indexPattern.id as string);
          // What keys changed from now and what the server returned
          const updatedBody = samePattern.getAsSavedObjectBody();

          // Build a list of changed keys from the server response
          // and ensure we ignore the key if the server response
          // is the same as the original response (since that is expected
          // if we made a change in that key)

          const serverChangedKeys: string[] = [];
          Object.entries(updatedBody).forEach(([key, value]) => {
            if (value !== (body as any)[key] && value !== (originalBody as any)[key]) {
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

            this.onNotification(
              { title, color: 'danger' },
              `updateSavedObject:${indexPattern.title}`
            );
            throw err;
          }

          // Set the updated response on this object
          serverChangedKeys.forEach((key) => {
            (indexPattern as any)[key] = (samePattern as any)[key];
          });
          indexPattern.version = samePattern.version;

          // Clear cache
          this.dataViewCache.clear(indexPattern.id!);

          // Try the save again
          return this.updateSavedObject(indexPattern, saveAttempts, ignoreErrors);
        }
        throw err;
      });
  }

  /**
   * Deletes an index pattern from .kibana index
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
   * If no possible data view found to become a default returns null
   *
   * @returns default data view
   */
  async getDefaultDataView(): Promise<DataView | null> {
    const patterns = await this.getIdsWithTitle();
    let defaultId: string | undefined = await this.config.get('defaultIndex');
    const exists = defaultId ? patterns.some((pattern) => pattern.id === defaultId) : false;

    if (defaultId && !exists) {
      await this.config.remove('defaultIndex');
      defaultId = undefined;
    }

    if (!defaultId && patterns.length >= 1 && (await this.hasUserDataView().catch(() => true))) {
      // try to set first user created data view as default,
      // otherwise fallback to any data view
      const userDataViews = patterns.filter(
        (pattern) =>
          pattern.title !== DEFAULT_ASSETS_TO_IGNORE.LOGS_INDEX_PATTERN &&
          pattern.title !== DEFAULT_ASSETS_TO_IGNORE.METRICS_INDEX_PATTERN
      );

      defaultId = userDataViews[0]?.id ?? patterns[0].id;
      await this.config.set('defaultIndex', defaultId);
    }

    if (defaultId) {
      return this.get(defaultId);
    } else {
      return null;
    }
  }
}

/**
 * @deprecated Use DataViewsService. All index pattern interfaces were renamed.
 */
export class IndexPatternsService extends DataViewsService {}

export type DataViewsContract = PublicMethodsOf<DataViewsService>;

/**
 * @deprecated Use DataViewsContract. All index pattern interfaces were renamed.
 */
export type IndexPatternsContract = DataViewsContract;
