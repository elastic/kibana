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

import { SavedObject } from 'src/core/server';
import { ISavedObjectsManagement } from '../services';
import { SavedObjectWithMetadata } from '../types';

export function injectMetaAttributes<T = unknown>(
  savedObject: SavedObject<T> | SavedObjectWithMetadata<T>,
  savedObjectsManagement: ISavedObjectsManagement
): SavedObjectWithMetadata<T> {
  const result = {
    ...savedObject,
    meta: (savedObject as SavedObjectWithMetadata).meta || {},
  };

  // Add extra meta information
  result.meta.icon = savedObjectsManagement.getIcon(savedObject.type);
  result.meta.title = savedObjectsManagement.getTitle(savedObject);
  result.meta.editUrl = savedObjectsManagement.getEditUrl(savedObject);
  result.meta.inAppUrl = savedObjectsManagement.getInAppUrl(savedObject);
  result.meta.namespaceType = savedObjectsManagement.getNamespaceType(savedObject);

  return result;
}
