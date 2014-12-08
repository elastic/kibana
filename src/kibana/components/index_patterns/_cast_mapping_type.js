define(function (require) {
  return function CastMappingTypeFn() {
    var IndexedArray = require('utils/indexed_array/index');

    castMappingType.types = new IndexedArray({
      index: ['name'],
      group: ['type'],
      immutable: true,
      initialSet: [
        { name: 'string',       type: 'string',     group: 'base'   },
        { name: 'date',         type: 'date',       group: 'base'   },
        { name: 'boolean',      type: 'boolean',    group: 'base'   },
        { name: 'float',        type: 'number',     group: 'number' },
        { name: 'double',       type: 'number',     group: 'number' },
        { name: 'integer',      type: 'number',     group: 'number' },
        { name: 'long',         type: 'number',     group: 'number' },
        { name: 'short',        type: 'number',     group: 'number' },
        { name: 'byte',         type: 'number',     group: 'number' },
        { name: 'token_count',  type: 'number',     group: 'number' },
        { name: 'geo_point',    type: 'geo_point',  group: 'geo'    },
        { name: 'geo_shape',    type: 'geo_shape',  group: 'geo'    },
        { name: 'ip',           type: 'ip',         group: 'other'  },
        { name: 'attachment',   type: 'attachment', group: 'other'  },
      ]
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