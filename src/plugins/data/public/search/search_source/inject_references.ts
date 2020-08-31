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

import { SearchSourceFields } from './types';
import { SavedObjectReference } from '../../../../../core/types';

export const injectReferences = (
  searchSourceFields: SearchSourceFields & { indexRefName: string },
  references: SavedObjectReference[]
) => {
  const searchSourceReturnFields: SearchSourceFields = { ...searchSourceFields };
  // Inject index id if a reference is saved
  if (searchSourceFields.indexRefName) {
    const reference = references.find((ref) => ref.name === searchSourceFields.indexRefName);
    if (!reference) {
      throw new Error(`Could not find reference for ${searchSourceFields.indexRefName}`);
    }
    // @ts-ignore
    searchSourceReturnFields.index = reference.id;
    // @ts-ignore
    delete searchSourceReturnFields.indexRefName;
  }

  if (searchSourceReturnFields.filter && Array.isArray(searchSourceReturnFields.filter)) {
    searchSourceReturnFields.filter.forEach((filterRow: any) => {
      if (!filterRow.meta || !filterRow.meta.indexRefName) {
        return;
      }
      const reference = references.find((ref: any) => ref.name === filterRow.meta.indexRefName);
      if (!reference) {
        throw new Error(`Could not find reference for ${filterRow.meta.indexRefName}`);
      }
      filterRow.meta.index = reference.id;
      delete filterRow.meta.indexRefName;
    });
  }

  return searchSourceReturnFields;
};
