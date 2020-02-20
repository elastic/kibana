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

export default function(api) {
  api.addEndpointDescription('search', {
    priority: 10, // collides with get doc by id
    data_autocomplete_rules: {
      query: {
        // populated by a global rule
      },
      profile: {
        __one_of: ['true', 'false'],
      },
      aggs: {
        __template: {
          NAME: {
            AGG_TYPE: {},
          },
        },
      },

      post_filter: {
        __scope_link: 'GLOBAL.filter',
      },
      size: {
        __template: 20,
      },
      from: 0,
      sort: {
        __template: [
          {
            FIELD: {
              order: 'desc',
            },
          },
        ],
        __any_of: [
          {
            '{field}': {
              order: {
                __one_of: ['desc', 'asc'],
              },
              missing: {
                __one_of: ['_last', '_first'],
              },
              mode: {
                __one_of: ['min', 'max', 'avg', 'sum'],
              },
              nested_path: '',
              nested_filter: {
                __scope_link: 'GLOBAL.filter',
              },
            },
          },
          '{field}',
          '_score',
          {
            _geo_distance: {
              __template: {
                FIELD: {
                  lat: 40,
                  lon: -70,
                },
                order: 'asc',
              },
              '{field}': {
                __one_of: [
                  {
                    __template: {
                      lat: 40,
                      lon: -70,
                    },
                    lat: 40,
                    lon: -70,
                  },
                  [
                    {
                      __template: {
                        lat: 40,
                        lon: -70,
                      },
                      lat: 40,
                      lon: -70,
                    },
                  ],
                  [''],
                  '',
                ],
              },
              distance_type: { __one_of: ['sloppy_arc', 'arc', 'plane'] },
              sort_mode: { __one_of: ['min', 'max', 'avg'] },
              order: { __one_of: ['asc', 'desc'] },
              unit: 'km',
            },
          },
        ],
      },
      stored_fields: ['{field}'],
      suggest: {
        __template: {
          YOUR_SUGGESTION: {
            text: 'YOUR TEXT',
            term: {
              FIELD: 'MESSAGE',
            },
          },
        },
        '*': {
          include: [],
          exclude: [],
        },
      },
      docvalue_fields: ['{field}'],
      collapse: {
        __template: {
          field: 'FIELD',
        },
      },
      indices_boost: {
        __template: [{ INDEX: 1.0 }],
      },
      rescore: {
        __template: {
          query: {},
          window_size: 50,
        },
      },
      script_fields: {
        __template: {
          FIELD: {
            script: {
              // populated by a global rule
            },
          },
        },
        '*': {
          __scope_link: 'GLOBAL.script',
        },
      },
      partial_fields: {
        __template: {
          NAME: {
            include: [],
          },
        },
        '*': {
          include: [],
          exclude: [],
        },
      },
      highlight: {
        // populated by a global rule
      },
      _source: {
        __one_of: [
          '{field}',
          ['{field}'],
          {
            includes: {
              __one_of: ['{field}', ['{field}']],
            },
            excludes: {
              __one_of: ['{field}', ['{field}']],
            },
          },
        ],
      },
      explain: {
        __one_of: [true, false],
      },
      stats: [''],
      timeout: '1s',
      version: { __one_of: [true, false] },
      track_total_hits: { __one_of: [true, false] },
    },
  });

  api.addEndpointDescription('search_template', {
    data_autocomplete_rules: {
      template: {
        __one_of: [{ __scope_link: 'search' }, { __scope_link: 'GLOBAL.script' }],
      },
      params: {},
    },
  });

  api.addEndpointDescription('render_search_template', {
    data_autocomplete_rules: {
      __one_of: [{ source: { __scope_link: 'search' } }, { __scope_link: 'GLOBAL.script' }],
      params: {},
    },
  });

  api.addEndpointDescription('_search/template/{id}', {
    data_autocomplete_rules: {
      template: {
        __scope_link: 'search',
      },
    },
  });
}
