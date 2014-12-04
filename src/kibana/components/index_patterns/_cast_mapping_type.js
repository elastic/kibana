define(function (require) {
  return function CastMappingTypeFn() {
    castMappingType.types = {
      'float': 'number',
      'double': 'number',
      'integer': 'number',
      'long': 'number',
      'short': 'number',
      'byte': 'number',
      'token_count': 'number',

      'date': 'date',
      'boolean': 'boolean',
      'ip': 'ip',
      'attachment': 'attachment',
      'geo_point': 'geo_point',
      'geo_shape': 'geo_shape',
      'string': 'string'
    };

    /**
     * Accepts a mapping type, and converts it into it's js equivilent
     * @param  {String} type - the type from the mapping's 'type' field
     * @return {String} - the most specific type that we care for
     */
    function castMappingType(type) {
      if (castMappingType.types[type]) return castMappingType.types[type];
      return 'string';
    }

    return castMappingType;
  };
});