/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ChromeStart } from '../../../core/public/chrome/types';
import type { OverlayStart } from '../../../core/public/overlays/overlay_service';
import type { SavedObjectsClientContract } from '../../../core/public/saved_objects/saved_objects_client';
import type {
  SavedObjectAttributes,
  SavedObjectReference,
} from '../../../core/types/saved_objects';
import { IndexPattern } from '../../data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternsContract } from '../../data/common/index_patterns/index_patterns/index_patterns';
import type {
  ISearchSource,
  SearchSourceFields,
} from '../../data/common/search/search_source/types';
import type { DataPublicPluginStart } from '../../data/public/types';

/** @deprecated */
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
  searchSourceFields?: SearchSourceFields;
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
  indexPatterns: IndexPatternsContract;
  search: DataPublicPluginStart['search'];
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
