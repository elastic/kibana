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

import { uiModules } from '../modules';

import {
  parseCommaSeparatedList,
  formatListAsProse,
} from '../../../utils';

uiModules
  .get('kibana')
  .filter('commaList', function () {
  /**
   * Angular filter that accepts either an array or a comma-separated string
   * and outputs a comma-separated string for presentation.
   *
   * @param {String|Array} input - The comma-separated list or array
   * @param {Boolean} inclusive - Should the list be joined with an "and"?
   * @return {String}
   */
    return function (input, inclusive = false) {
      return formatListAsProse(parseCommaSeparatedList(input), { inclusive });
    };
  });
