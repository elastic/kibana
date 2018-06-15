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

export const isString = value => typeof value === 'string';

export const isObject = value => typeof value === 'object';

export const isUndefined = value => typeof value === 'undefined';

export const hasValues = values => Object.keys(values).length > 0;

export const unique = (arr = []) =>
  arr.filter((value, index, array) => array.indexOf(value) === index);

const merge = (a, b) =>
  unique([...Object.keys(a), ...Object.keys(b)]).reduce((acc, key) => {
    if (isObject(a[key]) && isObject(b[key])) {
      return {
        ...acc,
        [key]: merge(a[key], b[key]),
      };
    } else {
      return {
        ...acc,
        [key]: isUndefined(b[key]) ? a[key] : b[key],
      };
    }
  }, {});

export const deepMerge = (...sources) =>
  sources.reduce((acc, source) => merge(acc, source));
