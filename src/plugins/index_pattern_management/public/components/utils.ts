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
import { IIndexPattern } from 'src/plugins/data/public';
import { SavedObjectsClientContract } from 'src/core/public';
import { IndexPatternManagementStart } from '../plugin';

export async function getIndexPatterns(
  savedObjectsClient: SavedObjectsClientContract,
  defaultIndex: string,
  indexPatternManagementStart: IndexPatternManagementStart
) {
  return (
    savedObjectsClient
      .find<IIndexPattern>({
        type: 'index-pattern',
        fields: ['title', 'type'],
        perPage: 10000,
      })
      .then((response) =>
        response.savedObjects
          .map((pattern) => {
            const id = pattern.id;
            const title = pattern.get('title');
            const isDefault = defaultIndex === id;

            const tags = (indexPatternManagementStart as IndexPatternManagementStart).list.getIndexPatternTags(
              pattern,
              isDefault
            );

            return {
              id,
              title,
              default: isDefault,
              tags,
              // the prepending of 0 at the default pattern takes care of prioritization
              // so the sorting will but the default index on top
              // or on bottom of a the table
              sort: `${isDefault ? '0' : '1'}${title}`,
            };
          })
          .sort((a, b) => {
            if (a.sort < b.sort) {
              return -1;
            } else if (a.sort > b.sort) {
              return 1;
            } else {
              return 0;
            }
          })
      ) || []
  );
}
