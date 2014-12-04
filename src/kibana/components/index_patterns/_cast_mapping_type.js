define(function (require) {
  return function CastMappingTypeFn() {
    var IndexedArray = require('utils/indexed_array/index');

    castMappingType.types = new IndexedArray({
      index: ['name'],
      group: ['type'],
      immutable: true,

      initialSet: [{
        name: 'float',
        type: 'number'
      }, {
        name: 'double',
        type: 'number'
      }, {
        name: 'integer',
        type: 'number'
      }, {
        name: 'long',
        type: 'number'
      }, {
        name: 'short',
        type: 'number'
      }, {
        name: 'byte',
        type: 'number'
      }, {
        name: 'token_count',
        type: 'number'
      }, {
        name: 'date',
        type: 'date'
      }, {
        name: 'boolean',
        type: 'boolean'
      }, {
        name: 'ip',
        type: 'ip'
      }, {
        name: 'attachment',
        type: 'attachment'
      }, {
        name: 'geo_point',
        type: 'geo_point'
      }, {
        name: 'geo_shape',
        type: 'geo_shape'
      }, {
        name: 'string',
        type: 'string'
      }]
    });

    /**
     * Accepts a mapping type, and converts it into it's js equivilent
     * @param  {String} type - the type from the mapping's 'type' field
     * @return {String} - the most specific type that we care for
     */
    function castMappingType(name) {
      var match = castMappingType.types.byName[name];

      if (match) return match.type;
      return 'string';
    }

    return castMappingType;
  };
});