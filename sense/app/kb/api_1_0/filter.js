define(function () {
  'use strict';

  var filters = {};

  filters.and = {
    __template: {
      filters: [
        {}
      ]
    },
    filters: [
      {
        __scope_link: '.'
      }
    ],
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.bool = {
    must: [
      {
        __scope_link: '.'
      }
    ],
    must_not: [
      {
        __scope_link: '.'
      }
    ],
    should: [
      {
        __scope_link: '.'
      }
    ],
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.exists = {
    __template: {
      'FIELD': 'VALUE'
    },
    '{field}': ''
  };


  filters.ids = {
    __template: {
      'values': ['ID']
    },
    'type': '{type}',
    'values': ['']
  };


  filters.limit = {
    __template: {
      value: 100
    },
    value: 100
  };


  filters.type = {
    __template: {
      value: 'TYPE'
    },
    value: '{type}'
  };


  filters.geo_bounding_box = {
    __template: {
      'FIELD': {
        'top_left': {
          'lat': 40.73,
          'lon': -74.1
        },
        'bottom_right': {
          'lat': 40.717,
          'lon': -73.99
        }
      }
    },

    '{field}': {
      top_left: {
        lat: 40.73,
        lon: -74.1
      },
      bottom_right: {
        lat: 40.73,
        lon: -74.1
      }
    },
    type: {
      __one_of: ['memory', 'indexed']
    },
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.geo_distance = {
    __template: {
      distance: 100,
      distance_unit: 'km',
      'FIELD': {
        lat: 40.73,
        lon: -74.1
      }
    },
    distance: 100,
    distance_unit: {
      __one_of: ['km', 'miles']
    },
    distance_type: {
      __one_of: ['arc', 'plane']
    },
    optimize_bbox: {
      __one_of: ['memory', 'indexed', 'none']
    },
    '{field}': {
      lat: 40.73,
      lon: -74.1
    },
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.geo_distance_range = {
    __template: {
      from: 100,
      to: 200,
      distance_unit: 'km',
      'FIELD': {
        lat: 40.73,
        lon: -74.1
      }
    },
    from: 100,
    to: 200,

    distance_unit: {
      __one_of: ['km', 'miles']
    },
    distance_type: {
      __one_of: ['arc', 'plane']
    },
    include_lower: {
      __one_of: [true, false]
    },
    include_upper: {
      __one_of: [true, false]
    },

    '{field}': {
      lat: 40.73,
      lon: -74.1
    },
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.geo_polygon = {
    __template: {
      'FIELD': {
        'points': [
          {
            lat: 40.73,
            lon: -74.1
          },
          {
            lat: 40.83,
            lon: -75.1
          }
        ]
      }
    },
    '{field}': {
      points: [
        {
          lat: 40.73,
          lon: -74.1
        }
      ]
    },
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.geo_shape = {
    __template: {
      'FIELD': {
        shape: {
          type: 'envelope',
          coordinates: [
            [-45, 45],
            [45, -45]
          ]
        },
        'relation': 'within'
      }
    },
    '{field}': {
      shape: {
        type: '',
        coordinates: []
      },
      indexed_shape: {
        id: '',
        index: '{index}',
        type: '{type}',
        shape_field_name: 'shape'
      },
      relation: {
        __one_of: ['within', 'intersects', 'disjoint']
      }
    }
  };


  filters.has_child = {
    __template: {
      type: 'TYPE',
      query: {}
    },
    type: '{type}',
    query: {},
    _scope: ''
  };


  filters.has_parent = {
    __template: {
      type: 'TYPE',
      query: {}
    },
    type: '{type}',
    query: {},
    _scope: ''
  };


  filters.m = filters.missing = {
    __template: {
      field: 'FIELD'
    },
    existence: {
      __one_of: [true, false]
    },
    null_value: {
      __one_of: [true, false]
    },
    field: '{field}'
  };


  filters.not = {
    __template: {
      filter: {}
    },
    filter: {
    },
    _cache: {
      __one_of: [true, false]
    }
  };


  filters.numeric_range = {
    __template: {
      'FIELD': {
        from: 10,
        to: 20
      }
    },
    "{field}": {
      from: 1,
      to: 20,
      include_lower: {
        __one_of: [true, false]
      },
      include_upper: {
        __one_of: [true, false]
      }
    }
  };


  filters.or = {
    __template: {
      filters: [
        {}
      ]
    },
    filters: [
      {
        __scope_link: '.'
      }
    ],
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.prefix = {
    __template: {
      'FIELD': 'VALUE'
    },
    '{field}': '',
    _cache: {
      __one_of: [true, false]
    }
  };


  filters.query = {
    // global query
  };


  filters.fquery = {
    __template: {
      query: {},
      _cache: true
    },
    query: {
      //global query
    },
    _cache: {
      __one_of: [true, false]
    }
  };


  filters.range = {
    __template: {
      'FIELD': {
        from: 10,
        to: 20
      }
    },
    "{field}": {
      from: 1,
      to: 20,
      include_lower: {
        __one_of: [true, false]
      },
      include_upper: {
        __one_of: [true, false]
      },
      _cache: {
        __one_of: [false, true]
      }
    }
  };


  filters.script = {
    __template: {
      script: 'SCRIPT',
      params: {}
    },
    script: '',
    params: {},
    _cache: {
      __one_of: [true, false]
    }
  };


  filters.term = {
    __template: {
      'FIELD': 'VALUE'
    },
    '{field}': '',
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.terms = {
    __template: {
      'FIELD': ['VALUE1', 'VALUE2']
    },
    field: ['{field}'],
    execution: {
      __one_of: ['plain', 'bool', 'and', 'or', 'bool_nocache', 'and_nocache', 'or_nocache']
    },
    _cache: {
      __one_of: [false, true]
    }
  };


  filters.nested = {
    __template: {
      path: 'path_to_nested_doc',
      query: {}
    },
    query: {},
    path: '',
    _cache: {
      __one_of: [true, false]
    },
    _name: ''
  };

  return function init(api) {
    api.addGlobalAutocompleteRules('filter', filters);
  };
});