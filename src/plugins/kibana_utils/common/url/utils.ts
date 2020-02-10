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
import { transform, isUndefined } from 'lodash';
import { stringify, parse, StringifyOptions } from 'query-string';
import { encodeQueryComponent } from './encode_query_component';

export const parseUrlQuery = <TReturn = Record<string, any>>(val: string): TReturn => {
  return (parse(val, { sort: false }) as unknown) as TReturn;
};

export const stringifyUrlQuery = (
  query: Record<string, any>,
  encodeFunction:
    | false
    | ((val: string, pctEncodeSpaces?: boolean) => string) = encodeQueryComponent,
  options: StringifyOptions = {}
) => {
  const encodedQuery =
    encodeFunction &&
    transform(query, (result, value, key) => {
      if (key) {
        result[key] = encodeFunction(isUndefined(value) ? '' : value, true);
      }
    });

  return stringify(encodedQuery || query, {
    strict: false,
    encode: false,
    sort: false,
    ...options,
  });
};
