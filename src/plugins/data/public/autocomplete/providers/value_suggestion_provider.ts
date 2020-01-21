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

import { memoize } from 'lodash';
import { CoreSetup } from 'src/core/public';
import { IIndexPattern, IFieldType } from '../../../common';

function resolver(title: string, field: IFieldType, query: string, boolFilter: any) {
  // Only cache results for a minute
  const ttl = Math.floor(Date.now() / 1000 / 60);

  return [ttl, query, title, field.name, JSON.stringify(boolFilter)].join('|');
}

export type ValueSuggestionsGetFn = (args: ValueSuggestionsGetFnArgs) => Promise<any[]>;

interface ValueSuggestionsGetFnArgs {
  indexPattern: IIndexPattern;
  field: IFieldType;
  query: string;
  boolFilter?: any[];
  signal?: AbortSignal;
}

export const setupValueSuggestionProvider = (core: CoreSetup): ValueSuggestionsGetFn => {
  const requestSuggestions = memoize(
    (index: string, field: IFieldType, query: string, boolFilter: any = [], signal?: AbortSignal) =>
      core.http.fetch(`/api/kibana/suggestions/values/${index}`, {
        method: 'POST',
        body: JSON.stringify({ query, field: field.name, boolFilter }),
        signal,
      }),
    resolver
  );

  return async ({
    indexPattern,
    field,
    query,
    boolFilter,
    signal,
  }: ValueSuggestionsGetFnArgs): Promise<any[]> => {
    const shouldSuggestValues = core!.uiSettings.get<boolean>('filterEditor:suggestValues');
    const { title } = indexPattern;

    if (field.type === 'boolean') {
      return [true, false];
    } else if (!shouldSuggestValues || !field.aggregatable || field.type !== 'string') {
      return [];
    }

    return await requestSuggestions(title, field, query, boolFilter, signal);
  };
};
