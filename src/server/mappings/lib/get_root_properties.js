import { getRootType } from './get_root_type';

/**
 *  Get the property mappings for the root type in the EsMappingsDsl
 *
 *  If the mappings don't have a root type, or the root type is not
 *  an object type (it's a keyword or something) this function will
 *  throw an error.
 *
 *  EsPropertyMappings objects have the root property names as their
 *  first level keys which map to the mappings object for each property.
 *  If the property is of type object it too could have a `properties`
 *  key whose value follows the same format.
 *
 *  This data can be found at `{indexName}.mappings.{typeName}.properties`
 *  in the es indices.get() response.
 *
 *  @param  {EsMappingsDsl} mappings
 *  @return {EsPropertyMappings}
 */
export function getRootProperties(mappings) {
  const mapping = mappings[getRootType(mappings)];

  if (mapping.type !== 'object' && !mapping.properties) {
    throw new TypeError('Unable to get property names non-object root mapping');
  }

  return mapping.properties || {};
}
