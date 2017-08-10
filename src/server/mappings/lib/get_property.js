import toPath from 'lodash/internal/toPath';

import { getRootType } from './get_root_type';

/**
 *  Recursively read properties from the mapping object of type "object"
 *  until the `path` is resolved.
 *  @param  {EsObjectMapping} mapping
 *  @param  {Array<string>} path
 *  @return {Objects|undefined}
 */
function getPropertyMappingFromObjectMapping(mapping, path) {
  const props = mapping && (mapping.properties || mapping.fields);

  if (!props) {
    return undefined;
  }

  if (path.length > 1) {
    return getPropertyMappingFromObjectMapping(
      props[path[0]],
      path.slice(1)
    );
  } else {
    return props[path[0]];
  }
}

/**
 *  Get the mapping for a specific property within the root type of the EsMappingsDsl.
 *  @param  {EsMappingsDsl} mappings
 *  @param  {string|Array<string>} path
 *  @return {Object|undefined}
 */
export function getProperty(mappings, path) {
  return getPropertyMappingFromObjectMapping(
    mappings[getRootType(mappings)],
    toPath(path)
  );
}
