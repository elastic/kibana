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

import { reduceRight } from 'lodash';

import { mapSpatialFilter } from './mappers/map_spatial_filter';
import { mapMatchAll } from './mappers/map_match_all';
import { mapPhrase } from './mappers/map_phrase';
import { mapPhrases } from './mappers/map_phrases';
import { mapRange } from './mappers/map_range';
import { mapExists } from './mappers/map_exists';
import { mapMissing } from './mappers/map_missing';
import { mapQueryString } from './mappers/map_query_string';
import { mapGeoBoundingBox } from './mappers/map_geo_bounding_box';
import { mapGeoPolygon } from './mappers/map_geo_polygon';
import { mapDefault } from './mappers/map_default';
import { generateMappingChain } from './generate_mapping_chain';
import { Filter } from '../../../../common';

export function mapFilter(filter: Filter) {
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
    mapSpatialFilter,
    mapMatchAll,
    mapRange,
    mapPhrase,
    mapPhrases,
    mapExists,
    mapMissing,
    mapQueryString,
    mapGeoBoundingBox,
    mapGeoPolygon,
    mapDefault,
  ];

  const noop = () => {
    throw new Error('No mappings have been found for filter.');
  };

  // Create a chain of responsibility by reducing all the
  // mappers down into one function.
  const mapFn = reduceRight<Function, Function>(
    mappers,
    (memo, map) => generateMappingChain(map, memo),
    noop
  );

  const mapped = mapFn(filter);

  // Map the filter into an object with the key and value exposed so it's
  // easier to work with in the template
  filter.meta = filter.meta || {};
  filter.meta.type = mapped.type;
  filter.meta.key = mapped.key;
  // Display value or formatter function.
  filter.meta.value = mapped.value;
  filter.meta.params = mapped.params;
  filter.meta.disabled = Boolean(filter.meta.disabled);
  filter.meta.negate = Boolean(filter.meta.negate);
  filter.meta.alias = filter.meta.alias || null;

  return filter;
}
