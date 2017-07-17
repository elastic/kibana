import { getRootType } from './get_root_type';

export function getRootProperties(mappings) {
  const mapping = mappings[getRootType(mappings)];

  if (mapping.type !== 'object' && !mapping.properties) {
    throw new TypeError('Unable to get property names non-object root mapping');
  }

  return mapping.properties || {};
}
