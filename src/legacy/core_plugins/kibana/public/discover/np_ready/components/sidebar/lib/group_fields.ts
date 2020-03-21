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
import { chain, sortBy } from 'lodash';
import { IndexPatternFieldList } from '../../../../../../../../../plugins/data/public';

/**
 * group the fields into popular and up-popular lists
 * TODO: No reason to use lodash here, legacy, to be refactored
 */
export function groupFields(
  fields: IndexPatternFieldList,
  columns: string[],
  popularLimit: number,
  fieldCounts: Record<string, number>
) {
  if (!Array.isArray(fields) || !Array.isArray(columns) || typeof fieldCounts !== 'object') {
    return {
      selected: [],
      popular: [],
      unpopular: [],
    };
  }
  return chain(fields)
    .sortBy(function(field) {
      return (field.count || 0) * -1;
    })
    .groupBy(function(field) {
      if (columns.includes(field.name)) return 'selected';
      return field.count ? 'popular' : 'unpopular';
    })
    .tap(function(groups) {
      groups.selected = sortBy(groups.selected || [], 'displayOrder');
      groups.popular = groups.popular || [];
      groups.unpopular = groups.unpopular || [];

      // move excess popular fields to un-popular list
      const extras = groups.popular.splice(popularLimit);
      groups.unpopular = extras.concat(groups.unpopular);
    })
    .commit()
    .value();
}
