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

export const isString = (value: any): value is string => typeof value === 'string';

export const isObject = (value: any): value is object =>
  typeof value === 'object' && value !== null;

export const hasValues = (values: any) => Object.keys(values).length > 0;

export const unique = <T>(arr: T[] = []): T[] => [...new Set(arr)];

const merge = (a: any, b: any): { [k: string]: any } =>
  unique([...Object.keys(a), ...Object.keys(b)]).reduce((acc, key) => {
    if (isObject(a[key]) && isObject(b[key]) && !Array.isArray(a[key]) && !Array.isArray(b[key])) {
      return {
        ...acc,
        [key]: merge(a[key], b[key]),
      };
    }

    return {
      ...acc,
      [key]: b[key] === undefined ? a[key] : b[key],
    };
  }, {});

export const mergeAll = (...sources: any[]) =>
  sources.filter(isObject).reduce((acc, source) => merge(acc, source));
