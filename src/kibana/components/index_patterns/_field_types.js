define(function (require) {
  return function IndexPatternFieldTypes() {
    var IndexedArray = require('utils/indexed_array/index');

    return new IndexedArray({
      index: ['name'],
      group: ['type'],
      immutable: true,
      initialSet: [
        { name: 'ip',         sortable: true,   filterable: true  },
        { name: 'date',       sortable: true,   filterable: true  },
        { name: 'string',     sortable: true,   filterable: true  },
        { name: 'number',     sortable: true,   filterable: true  },
        { name: 'boolean',    sortable: true,   filterable: true  },
        { name: 'conflict',   sortable: false,  filterable: false },
        { name: 'geo_point',  sortable: false,  filterable: true  },
        { name: 'geo_shape',  sortable: false,  filterable: true  },
        { name: 'attachment', sortable: false,  filterable: false },
      ]
    });
  };
});