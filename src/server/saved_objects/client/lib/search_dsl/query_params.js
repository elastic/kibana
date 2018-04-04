import { getRootProperties } from '../../../../mappings';
import { convertExperimentalFilterToEsDsl } from './experimental_filter';

/**
 *  Get the field params based on the searchFields and savedObjectTypes+rootAttributes from the mapping
 *  @param  {Array<string>} searchFields
 *  @param  {Array<string>} savedObjectTypes
 *  @param  {Array<string>} rootAttributes
 *  @return {Object}
 */
function getFieldsForTypes(searchFields, types, rootAttributes) {
  if (!searchFields || !searchFields.length) {
    return {
      all_fields: true
    };
  }

  return {
    fields: searchFields.reduce((acc, field) => [
      ...acc,
      ...rootAttributes.includes(field)
        ? [field]
        : types.map(prefix => `${prefix}.${field}`)
    ], []),
  };
}

function readMappings(mappings) {
  // object types in the mappings are for saved object types
  const savedObjectTypes = [];

  // non-object types are for shared/global attributes like updated_at and type
  const rootAttributes = [];

  for (const [propName, propMapping] of Object.entries(getRootProperties(mappings))) {
    if (propMapping.type === 'object' || propMapping.properties) {
      savedObjectTypes.push(propName);
    } else {
      rootAttributes.push(propName);
    }
  }

  return {
    savedObjectTypes,
    rootAttributes,
  };
}

/**
 *  Get the "query" related keys for the search body
 *  @param  {EsMapping} mapping mappings from Ui
 *  @param  {Object} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @param  {Object} experimentalFilter
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields, experimentalFilter) {
  if (!type && !search && !experimentalFilter) {
    return {};
  }

  const { savedObjectTypes, rootAttributes } = readMappings(mappings);
  const searchTypes = type ? [type] : savedObjectTypes;

  const bool = {};


  if (type) {
    bool.filter = [
      { term: { type } }
    ];
  }

  if (search) {
    bool.must = [
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            searchTypes,
            rootAttributes,
          )
        }
      }
    ];
  }

  if (experimentalFilter) {
    bool.filter = (bool.filter || []).concat(
      convertExperimentalFilterToEsDsl(searchTypes, rootAttributes, experimentalFilter)
    );
  }

  return { query: { bool } };
}
