export default function (api) {
  api.addEndpointDescription('search', {
    priority: 10, // collides with get doc by id
    data_autocomplete_rules: {
      query: {
        // populated by a global rule
      },
      aggs: {
        __template: {
          'NAME': {
            'AGG_TYPE': {}
          }
        }
      },

      post_filter: {
        __scope_link: 'GLOBAL.filter'
      },
      size: {
        __template: 20
      },
      from: 0,
      sort: {
        __template: [
          {
            'FIELD': {
              'order': 'desc'
            }
          }
        ],
        __any_of: [
          {
            '{field}': {
              'order': {
                __one_of: ['desc', 'asc']
              },
              missing: {
                __one_of: ['_last', '_first']
              },
              mode: {
                __one_of: ['min', 'max', 'avg', 'sum']
              },
              nested_path: '',
              nested_filter: {
                __scope_link: 'GLOBAL.filter'
              }
            }
          },
          '{field}',
          '_score',
          {
            '_geo_distance': {
              __template: {
                'FIELD': {
                  lat: 40,
                  lon: -70
                },
                order: 'asc'
              },
              '{field}': {
                __one_of: [
                  {
                    __template: {
                      lat: 40,
                      lon: -70
                    },
                    lat: 40,
                    lon: -70
                  },
                  [
                    {
                      __template: {
                        lat: 40,
                        lon: -70
                      },
                      lat: 40,
                      lon: -70
                    }
                  ],
                  [''],
                  ''
                ]
              },
              distance_type: { __one_of: ['sloppy_arc', 'arc', 'plane'] },
              sort_mode: { __one_of: ['min', 'max', 'avg'] },
              order: { __one_of: ['asc', 'desc'] },
              unit: 'km'
            }
          }
        ]
      },
      stored_fields: ['{field}'],
      docvalue_fields: ['{field}'],
      script_fields: {
        __template: {
          'FIELD': {
            'script': {
              // populated by a global rule
            }
          }
        },
        '*': {
          __scope_link: 'GLOBAL.script'
        }
      },
      partial_fields: {
        __template: {
          'NAME': {
            include: []
          }
        },
        '*': {
          include: [],
          exclude: []
        }
      },
      highlight: {
        // populated by a global rule
      },
      _source: {
        __one_of: [
          '{field}',
          ['{field}'],
          {
            'includes': {
              __one_of: [
                '{field}',
                ['{field}']
              ]
            },
            'excludes': {
              __one_of: [
                '{field}',
                ['{field}']
              ]
            }
          }
        ]
      },
      explain: {
        __one_of: [true, false]
      },
      stats: [''],
      timeout: '1s',
      version: { __one_of: [true, false] }
    }
  });

  api.addEndpointDescription('_search_template', {
    methods: ['GET'],
    patterns: [
      '{indices}/{types}/_search/template',
      '{indices}/_search/template',
      '_search/template'
    ],
    data_autocomplete_rules: {
      'template': {
        __one_of: [
          { __scope_link: '_search' },
          { __scope_link: 'GLOBAL.script' }
        ]
      },
      'params': {}
    }
  });

  api.addEndpointDescription('_render_search_template', {
    methods: ['GET'],
    patterns: [
      '_render/template'
    ],
    data_autocomplete_rules: {
      __one_of: [
        { 'inline': { __scope_link: '_search' } },
        { __scope_link: 'GLOBAL.script' }
      ],
      'params': {}
    }
  });

  api.addEndpointDescription('_render_search_template_with_id', {
    methods: ['GET'],
    patterns: [
      '_render/template/{id}'
    ],
    data_autocomplete_rules: {
      'params': {}
    }
  });

  api.addEndpointDescription('_get_delete_search_template', {
    methods: ['GET', 'DELETE'],
    patterns: [
      '_search/template/{id}'
    ]
  });

  api.addEndpointDescription('_search/template/{id}', {
    data_autocomplete_rules: {
      'template': {
        __scope_link: 'search'
      }
    }
  });
}
