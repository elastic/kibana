import _ from 'lodash';
import GenerateMappingChainProvider from './generate_mapping_chain';
import MapMatchAllProvider from './map_match_all';
import MapTermsProvider from './map_terms';
import MapRangeProvider from './map_range';
import MapExistsProvider from './map_exists';
import MapMissingProvider from './map_missing';
import MapQueryStringProvider from './map_query_string';
import MapGeoBoundingBoxProvider from './map_geo_bounding_box';
import MapScriptProvider from './map_script';
import MapDefaultProvider from './map_default';
export default function mapFilterProvider(Promise, Private) {

  const generateMappingChain = Private(GenerateMappingChainProvider);

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
    Private(MapMatchAllProvider),
    Private(MapTermsProvider),
    Private(MapRangeProvider),
    Private(MapExistsProvider),
    Private(MapMissingProvider),
    Private(MapQueryStringProvider),
    Private(MapGeoBoundingBoxProvider),
    Private(MapScriptProvider),
    Private(MapDefaultProvider)
  ];

  const noop = function () {
    return Promise.reject(new Error('No mappings have been found for filter.'));
  };

  // Create a chain of responsibility by reducing all the
  // mappers down into one function.
  const mapFn = _.reduceRight(mappers, function (memo, map) {
    const filterChainFn = generateMappingChain(map);
    return filterChainFn(memo);
  }, noop);

  /**
   * Map the filter into an object with the key and value exposed so it's
   * easier to work with in the template
   * @param {object} filter The filter the map
   * @returns {Promise}
   */
  return function (filter) {
    // Apply the mapping function
    return mapFn(filter).then(function (result) {
      filter.meta = filter.meta || {};
      filter.meta.key = result.key;
      filter.meta.value = result.value;
      filter.meta.disabled = !!(filter.meta.disabled);
      filter.meta.negate = !!(filter.meta.negate);
      filter.meta.alias = filter.meta.alias || null;
      return filter;
    });
  };
}
