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

import _ from 'lodash';
import { mappedColors } from './mapped_colors';

/*
 * Accepts an array of strings or numbers that are used to create a
 * a lookup table that associates the values (key) with a hex color (value).
 * Returns a function that accepts a value (i.e. a string or number)
 * and returns a hex color associated with that value.
 */

export function vislibColor(arrayOfStringsOrNumbers, colorMapping) {
  colorMapping = colorMapping || {};
  if (!Array.isArray(arrayOfStringsOrNumbers)) {
    throw new Error('ColorUtil expects an array');
  }

  arrayOfStringsOrNumbers.forEach(function(val) {
    if (!_.isString(val) && !_.isNumber(val) && !_.isUndefined(val)) {
      throw new TypeError('ColorUtil expects an array of strings, numbers, or undefined values');
    }
  });

  mappedColors.mapKeys(arrayOfStringsOrNumbers);

  return function(value) {
    return colorMapping[value] || mappedColors.get(value);
  };
}
