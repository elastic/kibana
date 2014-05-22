define(function (require) {
  return function CastMappingTypeFn() {
    /**
     * Accepts a mapping type, and converts it into it's js equivilent
     * @param  {String} type - the type from the mapping's 'type' field
     * @return {String} - the most specific type that we care for
     */
    return function castMappingType(type) {
      switch (type) {
      case 'float':
      case 'double':
      case 'integer':
      case 'long':
      case 'short':
      case 'byte':
      case 'token_count':
        return 'number';
      case 'date':
      case 'boolean':
      case 'ip':
      case 'attachment':
      case 'geo_point':
      case 'geo_shape':
        return type;
      default: // including 'string'
        return 'string';
      }
    };
  };
});