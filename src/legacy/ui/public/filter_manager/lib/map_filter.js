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
import { checkIsMatchAll } from './map_match_all';
import { checkIsPhrase } from './map_phrase';
import { checkIsPhrases } from './map_phrases';
import { checkIsRange } from './map_range';
import { checkIsExists } from './map_exists';
import { checkIsMissing } from './map_missing';
import { checkIsQueryString } from './map_query_string';
import { checkIsGeoBoundingBox } from './map_geo_bounding_box';
import { checkIsGeoPolygon } from './map_geo_polygon';
import { checkIsDefault } from './map_default';
import { generateMappingChain } from './generate_mapping_chain';

export async function mapFilter(indexPatterns, filter) {
  /** Mappers **/

  // Each mapper is a simple promise function that test if the mapper can
  // handle the mapping or not. If it handles it then it will resolve with
  // and object that has the key and value for the filter. Otherwise it will
  // reject it with the original filter. We had to go down the promise interface
  // because mapTerms and mapRange need access to the indexPatterns to format
  // the values and that's only available through the field formatters.

  // The mappers to apply. Each mapper will either return
  // a result object with a key and value attribute or
  // undefined. If undefined is return then the next
  // mapper will get the opportunity to map the filter.
  // To create a new mapper you just need to create a function
  // that either handles the mapping operation or not
  // and add it here. ProTip: These are executed in order listed
  const mappers = [
    checkIsMatchAll,
    checkIsRange(indexPatterns),
    checkIsPhrase(indexPatterns),
    checkIsPhrases,
    checkIsExists,
    checkIsMissing,
    checkIsQueryString,
    checkIsGeoBoundingBox(indexPatterns),
    checkIsGeoPolygon(indexPatterns),
    checkIsDefault,
  ];

  const noop = function () {
    throw new Error('No mappings have been found for filter.');
  };

  // Create a chain of responsibility by reducing all the
  // mappers down into one function.
  const mapFn = _.reduceRight(mappers, function (memo, map) {
    return generateMappingChain(map, memo);
  }, noop);

  /**
   * Map the filter into an object with the key and value exposed so it's
   * easier to work with in the template
   * @param {object} filter The filter the map
   * @returns {Promise}
   */
  return mapFn(filter).then(function (result) {
    filter.meta = filter.meta || {};
    filter.meta.type = result.type;
    filter.meta.key = result.key;
    filter.meta.value = result.value;
    filter.meta.params = result.params;
    filter.meta.disabled = !!(filter.meta.disabled);
    filter.meta.negate = !!(filter.meta.negate);
    filter.meta.alias = filter.meta.alias || null;
    return filter;
  });
}
