/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { SearchSource } from 'ui/courier';
import { SavedObjectAttributes, SavedObjectReference } from 'kibana/server';
import { IndexPattern } from '../../../core_plugins/data/public';

export interface SavedObject {
  _serialize: () => { attributes: SavedObjectAttributes; references: SavedObjectReference[] };
  _source: Record<string, unknown>;
  applyESResp: (resp: EsResponse) => any;
  applyEsResp: () => any;
  copyOnSave: boolean;
  creationOpts: (opts: CreationOpts) => Record<string, unknown>;
  defaults: any;
  delete?: () => Promise<{}>;
  destroy?: () => void;
  getDisplayName: () => string;
  getEsType: () => string;
  getFullPath: () => string;
  hydrateIndexPattern?: (id?: string) => angular.IPromise<null | void>;
  id?: string | null;
  index: string;
  init?: () => void;
  isSaving: boolean;
  isTitleChanged: any;
  lastSavedTitle: string;
  migrationVersion?: Record<string, any>;
  save: (saveOptions: SaveOptions) => Promise<string>;
  searchSource?: SearchSource;
  showInRecentlyAccessed: boolean;
  title: string;
}

export interface SaveOptions {
  confirmOverwrite?: boolean;
  isTitleDuplicateConfirmed?: boolean;
  onTitleDuplicate?: () => void;
}

export interface CreationOpts {
  references?: SavedObjectReference[];
  overwrite?: boolean;
}

export interface SavedObjectConfig {
  afterESResp?: () => any;
  clearSavedIndexPattern?: boolean;
  defaults?: any;
  extractReferences?: (opts: {
    attributes: SavedObjectAttributes;
    references: SavedObjectReference[];
  }) => {
    attributes: SavedObjectAttributes;
    references: SavedObjectReference[];
  };
  id?: string;
  indexPattern?: IndexPattern;
  init?: () => any;
  injectReferences?: any;
  mapping?: any;
  migrationVersion?: Record<string, any>;
  path?: string;
  searchSource?: SearchSource;
  type?: string;
}

export type EsResponse = Record<string, any>;

export type ConfirmModalPromise = (
  message: string,
  customOptions: Record<string, unknown>
) => angular.IPromise<unknown>;
