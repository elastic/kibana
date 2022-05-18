/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ChromeStart,
  OverlayStart,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SavedObjectReference,
} from '@kbn/core/public';
import {
  IndexPattern,
  ISearchSource,
  ISearchStart,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';

/**
 * @deprecated
 * @removeBy 8.8.0
 */
export interface SavedObject {
  _serialize: () => { attributes: SavedObjectAttributes; references: SavedObjectReference[] };
  _source: Record<string, unknown>;
  applyESResp: (resp: EsResponse) => Promise<SavedObject>;
  copyOnSave: boolean;
  creationOpts: (opts: SavedObjectCreationOpts) => Record<string, unknown>;
  defaults: any;
  delete?: () => Promise<{}>;
  destroy: () => void;
  getDisplayName: () => string;
  getEsType: () => string;
  getFullPath: () => string;
  hydrateIndexPattern?: (id?: string) => Promise<null | IndexPattern>;
  id?: string;
  init?: () => Promise<SavedObject>;
  isSaving: boolean;
  isTitleChanged: () => boolean;
  lastSavedTitle: string;
  migrationVersion?: Record<string, any>;
  save: (saveOptions: SavedObjectSaveOpts) => Promise<string>;
  searchSource?: ISearchSource;
  searchSourceFields?: SerializedSearchSourceFields;
  showInRecentlyAccessed: boolean;
  title: string;
  unresolvedIndexPatternReference?: SavedObjectReference;
}

export interface SavedObjectSaveOpts {
  confirmOverwrite?: boolean;
  isTitleDuplicateConfirmed?: boolean;
  onTitleDuplicate?: () => void;
  returnToOrigin?: boolean;
}

export interface SavedObjectCreationOpts {
  references?: SavedObjectReference[];
  overwrite?: boolean;
}

export interface SavedObjectKibanaServices {
  savedObjectsClient: SavedObjectsClientContract;
  dataViews: DataViewsContract;
  search: ISearchStart;
  chrome: ChromeStart;
  overlays: OverlayStart;
}

export interface SavedObjectAttributesAndRefs {
  attributes: SavedObjectAttributes;
  references: SavedObjectReference[];
}

export interface SavedObjectConfig {
  // is only used by visualize
  afterESResp?: (savedObject: SavedObject) => Promise<SavedObject>;
  defaults?: any;
  extractReferences?: (opts: SavedObjectAttributesAndRefs) => SavedObjectAttributesAndRefs;
  injectReferences?: <T extends SavedObject>(object: T, references: SavedObjectReference[]) => void;
  id?: string;
  init?: () => void;
  indexPattern?: IndexPattern;
  mapping?: Record<string, any>;
  migrationVersion?: Record<string, any>;
  path?: string;
  searchSource?: ISearchSource | boolean;
  type?: string;
}

export type EsResponse = Record<string, any>;
