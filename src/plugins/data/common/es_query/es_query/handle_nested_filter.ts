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

import { getFilterField, cleanFilter, Filter } from '../filters';
import { IIndexPattern } from '../../index_patterns';

export const handleNestedFilter = (filter: Filter, indexPattern?: IIndexPattern) => {
  if (!indexPattern) return filter;

  const fieldName = getFilterField(filter);
  if (!fieldName) {
    return filter;
  }

  const field = indexPattern.fields.find(indexPatternField => indexPatternField.name === fieldName);
  if (!field || !field.subType || !field.subType.nested || !field.subType.nested.path) {
    return filter;
  }

  const query = cleanFilter(filter);

  return {
    meta: filter.meta,
    nested: {
      path: field.subType.nested.path,
      query: query.query || query,
    },
  };
};
