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

import { IconType } from '@elastic/eui';
import { SavedObject as SavedObjectType, SavedObjectAttributes } from '../../../core/public';

export interface DashboardCapabilities {
  showWriteControls: boolean;
  createNew: boolean;
}

// TODO: Replace Saved object interfaces by the ones Core will provide when it is ready.
export type SavedObjectAttribute =
  | string
  | number
  | boolean
  | null
  | undefined
  | SavedObjectAttributes
  | SavedObjectAttributes[];

export interface SimpleSavedObject<T extends SavedObjectAttributes> {
  attributes: T;
  _version?: SavedObjectType<T>['version'];
  id: SavedObjectType<T>['id'];
  type: SavedObjectType<T>['type'];
  migrationVersion: SavedObjectType<T>['migrationVersion'];
  error: SavedObjectType<T>['error'];
  references: SavedObjectType<T>['references'];
  get(key: string): any;
  set(key: string, value: any): T;
  has(key: string): boolean;
  save(): Promise<SimpleSavedObject<T>>;
  delete(): void;
}

export interface SavedObjectMetaData<T extends SavedObjectAttributes> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SimpleSavedObject<T>): IconType;
  getTooltipForSavedObject?(savedObject: SimpleSavedObject<T>): string;
  showSavedObject?(savedObject: SimpleSavedObject<T>): boolean;
}

interface FieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
}

export interface Field {
  name: string;
  type: string;
  // esTypes might be undefined on old index patterns that have not been refreshed since we added
  // this prop. It is also undefined on scripted fields.
  esTypes?: string[];
  aggregatable: boolean;
  filterable: boolean;
  searchable: boolean;
  subType?: FieldSubType;
}
