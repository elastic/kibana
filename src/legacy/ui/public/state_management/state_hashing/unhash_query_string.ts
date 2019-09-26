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

import { mapValues } from 'lodash';
import { ParsedUrlQuery } from 'querystring';
import { State } from '../state';

/**
 * Takes in a parsed url query and state objects, finding the state objects that match the query parameters and expanding
 * the hashed state. For example, a url query string like '?_a=@12353&_g=@19028df' will become
 * '?_a=[expanded app state here]&_g=[expanded global state here]. This is used when storeStateInSessionStorage is turned on.
 */
export function unhashQueryString(
  parsedQueryString: ParsedUrlQuery,
  states: State[]
): ParsedUrlQuery {
  return mapValues(parsedQueryString, (val, key) => {
    const state = states.find(s => key === s.getQueryParamName());
    return state ? state.translateHashToRison(val) : val;
  });
}
