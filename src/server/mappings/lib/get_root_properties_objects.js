import { getRootProperties } from './get_root_properties';

/**
 *  Get the property mappings for the root type in the EsMappingsDsl
 *  where the properties are objects
 *
 *  If the mappings don't have a root type, or the root type is not
 *  an object type (it's a keyword or something) this function will
 *  throw an error.
 *
 *  This data can be found at `{indexName}.mappings.{typeName}.properties`
 *  in the es indices.get() response where the properties are objects.
 *
 *  @param  {EsMappingsDsl} mappings
 *  @return {EsPropertyMappings}
 */
export function getRootPropertiesObjects(mappings) {
  const rootProperties = getRootProperties(mappings);
  return Object.entries(rootProperties).reduce((acc, [key, value]) => {

    // we consider the existence of the properties or type of object to designate that this is an object datatype
    if (value.properties || value.type === 'object') {
      acc[key] = value;
    }

    return acc;
  }, {});
}
