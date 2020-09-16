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

import { SavedObject } from 'src/core/types';
import { SavedObjectsNamespaceType } from 'src/core/public';

/**
 * The metadata injected into a {@link SavedObject | saved object} when returning
 * {@link SavedObjectWithMetadata | enhanced objects} from the plugin API endpoints.
 */
export interface SavedObjectMetadata {
  icon?: string;
  title?: string;
  editUrl?: string;
  inAppUrl?: { path: string; uiCapabilitiesPath: string };
  namespaceType?: SavedObjectsNamespaceType;
}

/**
 * A {@link SavedObject | saved object} enhanced with meta properties used by the client-side plugin.
 */
export type SavedObjectWithMetadata<T = unknown> = SavedObject<T> & {
  meta: SavedObjectMetadata;
};

/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export interface SavedObjectRelation {
  id: string;
  type: string;
  relationship: 'child' | 'parent';
  meta: SavedObjectMetadata;
}
