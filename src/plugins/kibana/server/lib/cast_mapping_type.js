const types = {
  string: {type: 'string', group: 'base'},
  text: {type: 'string', group: 'base'},
  keyword: {type: 'string', group: 'base'},
  date: {type: 'date', group: 'base'},
  boolean: {type: 'boolean', group: 'base'},
  float: {type: 'number', group: 'number'},
  double: {type: 'number', group: 'number'},
  integer: {type: 'number', group: 'number'},
  long: {type: 'number', group: 'number'},
  short: {type: 'number', group: 'number'},
  byte: {type: 'number', group: 'number'},
  token_count: {type: 'number', group: 'number'},
  geo_point: {type: 'geo_point', group: 'geo'},
  geo_shape: {type: 'geo_shape', group: 'geo'},
  ip: {type: 'ip', group: 'other'},
  attachment: {type: 'attachment', group: 'other'},
  murmur3: {type: 'murmur3', group: 'hash'},
  conflict: {type: 'conflict', group: 'other'}
};

/**
 * Based on _cast_mapping_type from ui/index_patterns
 * Accepts a mapping type, and converts it into its js equivilent
 * @param  {String} type - the type from the mapping's 'type' field
 * @return {String} - the most specific type that we care for
 */
export default function castMappingType(name) {
  if (!name) return 'unknown';

  var match = types[name];
  return match ? match.type : 'string';
};
