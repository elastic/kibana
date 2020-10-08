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

/**
 * @param {Function} by - it's a callback which determines how data will be mapped.
 * @return {Function} function - a predefined filter function
 */
export const makeFilter = (by) =>
  /**
   * @param {*} value
   * @return {Function} function - the predefined filter function with a filter value
   */
  (value) =>
    /**
     * @param {Array|Object} data
     * @return {*} result - it depends on "by" outcome.
     */
    (data) => by(data, value);

/**
 * @param {Array} annotations
 * [
 *   {key: 1555189200000, ...},
 *   {key: 1555263300000, ...},
 * ]
 * @param {*} filterValue
 * @return {Array} filtered array
 */
export const annotationFilter = (annotations, filterValue) =>
  annotations.filter(({ key }) => key <= filterValue);

/**
 * @type {Function}
 */
export const filterAnnotations = makeFilter(annotationFilter);
