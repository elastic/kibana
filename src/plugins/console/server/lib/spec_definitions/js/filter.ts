/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { SpecDefinitionsService } from '../../../services';

/* eslint-disable @typescript-eslint/camelcase */
const filters: Record<string, any> = {};

filters.and = {
  __template: {
    filters: [{}],
  },
  filters: [
    {
      __scope_link: '.',
    },
  ],
};

filters.bool = {
  __scope_link: 'GLOBAL.query',
};

filters.exists = {
  __template: {
    field: 'FIELD_NAME',
  },
  field: '{field}',
};

filters.ids = {
  __template: {
    values: ['ID'],
  },
  type: '{type}',
  values: [''],
};

filters.limit = {
  __template: {
    value: 100,
  },
  value: 100,
};

filters.geo_bounding_box = {
  __template: {
    FIELD: {
      top_left: {
        lat: 40.73,
        lon: -74.1,
      },
      bottom_right: {
        lat: 40.717,
        lon: -73.99,
      },
    },
  },

  '{field}': {
    top_left: {
      lat: 40.73,
      lon: -74.1,
    },
    bottom_right: {
      lat: 40.73,
      lon: -74.1,
    },
  },
  type: {
    __one_of: ['memory', 'indexed'],
  },
};

filters.geo_distance = {
  __template: {
    distance: 100,
    distance_unit: 'km',
    FIELD: {
      lat: 40.73,
      lon: -74.1,
    },
  },
  distance: 100,
  distance_unit: {
    __one_of: ['km', 'miles'],
  },
  distance_type: {
    __one_of: ['arc', 'plane'],
  },
  optimize_bbox: {
    __one_of: ['memory', 'indexed', 'none'],
  },
  '{field}': {
    lat: 40.73,
    lon: -74.1,
  },
};

filters.geo_distance_range = {
  __template: {
    from: 100,
    to: 200,
    distance_unit: 'km',
    FIELD: {
      lat: 40.73,
      lon: -74.1,
    },
  },
  from: 100,
  to: 200,

  distance_unit: {
    __one_of: ['km', 'miles'],
  },
  distance_type: {
    __one_of: ['arc', 'plane'],
  },
  include_lower: {
    __one_of: [true, false],
  },
  include_upper: {
    __one_of: [true, false],
  },

  '{field}': {
    lat: 40.73,
    lon: -74.1,
  },
};

filters.geo_polygon = {
  __template: {
    FIELD: {
      points: [
        {
          lat: 40.73,
          lon: -74.1,
        },
        {
          lat: 40.83,
          lon: -75.1,
        },
      ],
    },
  },
  '{field}': {
    points: [
      {
        lat: 40.73,
        lon: -74.1,
      },
    ],
  },
};

filters.geo_shape = {
  __template: {
    FIELD: {
      shape: {
        type: 'envelope',
        coordinates: [
          [-45, 45],
          [45, -45],
        ],
      },
      relation: 'within',
    },
  },
  '{field}': {
    shape: {
      type: '',
      coordinates: [],
    },
    indexed_shape: {
      id: '',
      index: '{index}',
      type: '{type}',
      shape_field_name: 'shape',
    },
    relation: {
      __one_of: ['within', 'intersects', 'disjoint'],
    },
  },
};

filters.has_child = {
  __template: {
    type: 'TYPE',
    filter: {},
  },
  type: '{type}',
  query: {},
  filter: {},
  _scope: '',
  min_children: 1,
  max_children: 10,
};

filters.has_parent = {
  __template: {
    parent_type: 'TYPE',
    filter: {},
  },
  parent_type: '{type}',
  query: {},
  filter: {},
  _scope: '',
};

filters.m = filters.missing = {
  __template: {
    field: 'FIELD',
  },
  existence: {
    __one_of: [true, false],
  },
  null_value: {
    __one_of: [true, false],
  },
  field: '{field}',
};

filters.not = {
  __template: {
    filter: {},
  },
  filter: {},
};

filters.range = {
  __template: {
    FIELD: {
      gte: 10,
      lte: 20,
    },
  },
  '{field}': {
    gte: 1,
    gt: 1,
    lte: 20,
    lt: 20,
    time_zone: '+01:00',
    format: 'dd/MM/yyyy||yyyy',
    execution: { __one_of: ['index', 'fielddata'] },
  },
};

filters.or = {
  __template: {
    filters: [{}],
  },
  filters: [
    {
      __scope_link: '.',
    },
  ],
};

filters.prefix = {
  __template: {
    FIELD: 'VALUE',
  },
  '{field}': '',
};

filters.query = {
  // global query
};

filters.script = {
  __template: {
    script: {},
  },
  script: {
    // populated by a global rule
  },
};

filters.term = {
  __template: {
    FIELD: 'VALUE',
  },
  '{field}': '',
};

filters.terms = {
  __template: {
    FIELD: ['VALUE1', 'VALUE2'],
  },
  field: ['{field}'],
  execution: {
    __one_of: ['plain', 'bool', 'and', 'or', 'bool_nocache', 'and_nocache', 'or_nocache'],
  },
};

filters.nested = {
  __template: {
    path: 'path_to_nested_doc',
    query: {},
  },
  query: {},
  path: '',
  _name: '',
};

export const filter = (specService: SpecDefinitionsService) => {
  specService.addGlobalAutocompleteRules('filter', filters);
};
