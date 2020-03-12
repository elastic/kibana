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
import _ from 'lodash';
import { SavedObjectReference } from 'kibana/public';
import { migrateLegacyQuery } from '../../../../kibana_legacy/public';
import { InvalidJSONProperty } from '../../../../kibana_utils/public';
import { SearchSource } from './search_source';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { SearchSourceFields } from './types';

export const parseSearchSource = (indexPatterns: IndexPatternsContract) => async (
  searchSourceJson: string,
  references: SavedObjectReference[]
) => {
  const searchSource = new SearchSource();

  // if we have a searchSource, set its values based on the searchSourceJson field
  let searchSourceValues: Record<string, unknown>;
  try {
    searchSourceValues = JSON.parse(searchSourceJson);
  } catch (e) {
    throw new InvalidJSONProperty(
      `Invalid JSON in search source. ${e.message} JSON: ${searchSourceJson}`
    );
  }

  // This detects a scenario where documents with invalid JSON properties have been imported into the saved object index.
  // (This happened in issue #20308)
  if (!searchSourceValues || typeof searchSourceValues !== 'object') {
    throw new InvalidJSONProperty('Invalid JSON in search source.');
  }

  // Inject index id if a reference is saved
  if (searchSourceValues.indexRefName) {
    const reference = references.find(ref => ref.name === searchSourceValues.indexRefName);
    if (!reference) {
      throw new Error(`Could not find reference for ${searchSourceValues.indexRefName}`);
    }
    searchSourceValues.index = reference.id;
    delete searchSourceValues.indexRefName;
  }

  if (searchSourceValues.filter && Array.isArray(searchSourceValues.filter)) {
    searchSourceValues.filter.forEach((filterRow: any) => {
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

  if (searchSourceValues.index && typeof searchSourceValues.index === 'string') {
    searchSourceValues.index = await indexPatterns.get(searchSourceValues.index);
  }

  const searchSourceFields = searchSource.getFields();
  const fnProps = _.transform(
    searchSourceFields,
    function(dynamic, val, name) {
      if (_.isFunction(val) && name) dynamic[name] = val;
    },
    {}
  );

  // This assignment might hide problems because the type of values passed from the parsed JSON
  // might not fit the SearchSourceFields interface.
  const newFields: SearchSourceFields = _.defaults(searchSourceValues, fnProps);

  searchSource.setFields(newFields);
  const query = searchSource.getOwnField('query');

  if (typeof query !== 'undefined') {
    searchSource.setField('query', migrateLegacyQuery(query));
  }

  return searchSource;
};
