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
import { HttpSetup, SavedObjectsClientContract } from 'src/core/public';
import { IIndexPattern, IndexPatternsApiClient } from '../../../data/public';
import { IndexPatternManagementStart } from '../plugin';
export const getIndexPatterns = async (
  savedObjectsClient: SavedObjectsClientContract,
  defaultIndex: string,
  indexPatternManagementStart: IndexPatternManagementStart,
  http: HttpSetup
) => {
  const response = await savedObjectsClient.find<IIndexPattern>({
    type: 'index-pattern',
    fields: ['title', 'patternList'],
    perPage: 10000,
  });
  const apiClient = new IndexPatternsApiClient(http);
  if (response.savedObjects.length === 0) {
    return [];
  }
  const patterns = await Promise.all(
    response.savedObjects.map(async (pattern) => {
      const id = pattern.id;
      const title = pattern.get('title');
      const patternList = pattern.get('patternList');
      const patternListActive = await apiClient.validatePatternListActive({
        patternList,
      });
      const isDefault = defaultIndex === id;

      const tags = (indexPatternManagementStart as IndexPatternManagementStart).list.getIndexPatternTags(
        pattern,
        isDefault
      );

      return {
        patternListActive,
        patternList,
        default: isDefault,
        id,
        tags,
        // the prepending of 0 at the default pattern takes care of prioritization
        // so the sorting will but the default index on top
        // or on bottom of a the table
        sort: `${isDefault ? '0' : '1'}${title}`,
        title,
      };
    })
  );
  return patterns.sort((a, b) => {
    if (a.sort < b.sort) {
      return -1;
    } else if (a.sort > b.sort) {
      return 1;
    } else {
      return 0;
    }
  });
};
