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
import { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
import { SavedObject } from '../types';
import { InvalidJSONProperty } from '../../../../../plugins/kibana_utils/public';

export function parseSearchSource(
  savedObject: SavedObject,
  esType: string,
  searchSourceJson: string,
  references: any[]
) {
  if (!savedObject.searchSource) return;

  // if we have a searchSource, set its values based on the searchSourceJson field
  let searchSourceValues: Record<string, any>;
  try {
    searchSourceValues = JSON.parse(searchSourceJson);
  } catch (e) {
    throw new InvalidJSONProperty(
      `Invalid JSON in ${esType} "${savedObject.id}". ${e.message} JSON: ${searchSourceJson}`
    );
  }

  // This detects a scenario where documents with invalid JSON properties have been imported into the saved object index.
  // (This happened in issue #20308)
  if (!searchSourceValues || typeof searchSourceValues !== 'object') {
    throw new InvalidJSONProperty(`Invalid searchSourceJSON in ${esType} "${savedObject.id}".`);
  }

  // Inject index id if a reference is saved
  if (searchSourceValues.indexRefName) {
    const reference = references.find(
      (ref: Record<string, any>) => ref.name === searchSourceValues.indexRefName
    );
    if (!reference) {
      throw new Error(
        `Could not find reference for ${
          searchSourceValues.indexRefName
        } on ${savedObject.getEsType()} ${savedObject.id}`
      );
    }
    searchSourceValues.index = reference.id;
    delete searchSourceValues.indexRefName;
  }

  if (searchSourceValues.filter) {
    searchSourceValues.filter.forEach((filterRow: any) => {
      if (!filterRow.meta || !filterRow.meta.indexRefName) {
        return;
      }
      const reference = references.find((ref: any) => ref.name === filterRow.meta.indexRefName);
      if (!reference) {
        throw new Error(
          `Could not find reference for ${
            filterRow.meta.indexRefName
          } on ${savedObject.getEsType()}`
        );
      }
      filterRow.meta.index = reference.id;
      delete filterRow.meta.indexRefName;
    });
  }

  const searchSourceFields = savedObject.searchSource.getFields();
  const fnProps = _.transform(
    searchSourceFields,
    function(dynamic: Record<string, any>, val: any, name: string | undefined) {
      if (_.isFunction(val) && name) dynamic[name] = val;
    },
    {}
  );

  savedObject.searchSource.setFields(_.defaults(searchSourceValues, fnProps));
  const query = savedObject.searchSource.getOwnField('query');

  if (typeof query !== 'undefined') {
    savedObject.searchSource.setField('query', migrateLegacyQuery(query));
  }
}
