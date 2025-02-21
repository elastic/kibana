/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, reduceRight } from 'lodash';

import { Filter } from '@kbn/es-query';
import { mapCombined } from './mappers/map_combined';
import { mapSpatialFilter } from './mappers/map_spatial_filter';
import { mapMatchAll } from './mappers/map_match_all';
import { mapPhrase } from './mappers/map_phrase';
import { mapPhrases } from './mappers/map_phrases';
import { mapRange } from './mappers/map_range';
import { mapExists } from './mappers/map_exists';
import { mapQueryString } from './mappers/map_query_string';
import { mapDefault } from './mappers/map_default';
import { generateMappingChain } from './generate_mapping_chain';

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
    mapCombined,
    mapSpatialFilter,
    mapMatchAll,
    mapRange,
    mapPhrase,
    mapPhrases,
    mapExists,
    mapQueryString,
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

  const mappedFilter = cloneDeep(filter);
  const mapped = mapFn(mappedFilter);

  // Map the filter into an object with the key and value exposed so it's
  // easier to work with in the template
  mappedFilter.meta = filter.meta || {};
  mappedFilter.meta.type = mapped.type;
  mappedFilter.meta.key = mapped.key;
  // Display value or formatter function.
  mappedFilter.meta.value = mapped.value;
  mappedFilter.meta.params = mapped.params;
  mappedFilter.meta.disabled = Boolean(mappedFilter.meta.disabled);
  mappedFilter.meta.negate = Boolean(mappedFilter.meta.negate);
  mappedFilter.meta.alias = mappedFilter.meta.alias;

  return mappedFilter;
}
