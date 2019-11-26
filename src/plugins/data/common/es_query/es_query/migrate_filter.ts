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

import { get, omit } from 'lodash';
import { getConvertedValueForField } from '../filters';
import { Filter } from '../filters';
import { IIndexPattern } from '../../index_patterns';

/** @deprecated
 * see https://github.com/elastic/elasticsearch/pull/17508
 * */
export interface DeprecatedMatchPhraseFilter extends Filter {
  match: {
    [field: string]: {
      query: any;
      type: 'phrase';
    };
  };
}

/** @deprecated
 * see https://github.com/elastic/elasticsearch/pull/17508
 * */
function isMatchPhraseFilter(filter: any): filter is DeprecatedMatchPhraseFilter {
  const fieldName = filter.match && Object.keys(filter.match)[0];

  return Boolean(fieldName && get(filter, ['match', fieldName, 'type']) === 'phrase');
}

export function migrateFilter(filter: Filter, indexPattern: IIndexPattern | null) {
  if (isMatchPhraseFilter(filter)) {
    const fieldName = Object.keys(filter.match)[0];
    const params: Record<string, any> = get(filter, ['match', fieldName]);
    if (indexPattern) {
      const field = indexPattern.fields.find(f => f.name === fieldName);

      if (field) {
        params.query = getConvertedValueForField(field, params.query);
      }
    }
    return {
      match_phrase: {
        [fieldName]: omit(params, 'type'),
      },
    };
  }

  return filter;
}
