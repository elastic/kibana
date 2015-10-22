let _ = require("lodash");

var SPAN_QUERIES = {
  // TODO add one_of for objects
  span_first: {
    __scope_link: '.span_first'
  },
  span_near: {
    __scope_link: '.span_near'
  },
  span_or: {
    __scope_link: '.span_or'
  },
  span_not: {
    __scope_link: '.span_not'
  },
  span_term: {
    __scope_link: '.span_term'
  },
  span_containing: {
    __scope_link: '.span_containing'
  },
  span_within: {
    __scope_link: '.span_within'
  }
};

var DECAY_FUNC_DESC = {
    __template: {
      "FIELD": {
        "origin": "",
        "scale": ""
      }
    },
    "{field}": {
      "origin": "",
      "scale": "",
      "offset": "",
      "decay": 0.5
    }
  },
  SCORING_FUNCS = {
    "script_score": {
      __template: {
        "script": "_score * doc['f'].value"
      },
      "script": {
        //populated by a global rule
      }
    },
    "boost_factor": 2.0,
    "random_score": {
      "seed": 314159265359
    },
    "linear": DECAY_FUNC_DESC,
    "exp": DECAY_FUNC_DESC,
    "gauss": DECAY_FUNC_DESC,
    "field_value_factor": {
      __template: {
        "field": ""
      },
      "field": "{field}",
      "factor": 1.2,
      "modifier": {
        __one_of: ["none", "log", "log1p", "log2p", "ln", "ln1p", "ln2p", "square", "sqrt", "reciprocal"]
      }
    }
  };

module.exports = function (api) {
  api.addGlobalAutocompleteRules('query', {
    match: {
      __template: {
        'FIELD': 'TEXT'
      },
      '{field}': {
        'query': '',
        'operator': {
          __one_of: ['and', 'or']
        },
        'type': {
          __one_of: ['phrase', 'phrase_prefix', 'boolean']
        },
        'max_expansions': 10,
        'analyzer': '',
        'fuzziness': 1.0,
        'prefix_length': 1
      }
    },
    match_phrase: {
      __template: {
        'FIELD': 'PHRASE'
      },
      '{field}': {
        query: '',
        analyzer: ''
      }
    },
    match_phrase_prefix: {
      __template: {
        'FIELD': 'PREFIX'
      },
      '{field}': {
        query: '',
        analyzer: '',
        max_expansions: 10,
        prefix_length: 1,
        fuzziness: 0.1
      }
    },
    multi_match: {
      __template: {
        'query': '',
        'fields': []
      },
      query: '',
      fields: ['{field}'],
      use_dis_max: {
        __template: true,
        __one_of: [true, false]
      },
      tie_breaker: 0.0,
      type: {__one_of: ['best_fields', 'most_fields', 'cross_fields', 'phrase', 'phrase_prefix']}
    },
    bool: {
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
      filter: {
        __scope_link: 'GLOBAL.filter'
      },
      minimum_number_should_match: 1,
      boost: 1.0
    },
    boosting: {
      positive: {
        __scope_link: '.'
      },
      negative: {
        __scope_link: '.'
      },
      negative_boost: 0.2
    },
    ids: {
      type: '',
      values: []
    },
    constant_score: {
      __template: {
        filter: {},
        boost: 1.2
      },
      query: {},
      filter: {},
      boost: 1.2
    },
    dis_max: {
      __template: {
        tie_breaker: 0.7,
        boost: 1.2,
        queries: []
      },
      tie_breaker: 0.7,
      boost: 1.2,
      queries: [
        {
          __scope_link: '.'
        }
      ]
    },
    field: {
      '{field}': {
        query: '',
        boost: 2.0,
        enable_position_increments: {
          __template: false,
          __one_of: [true, false]
        }
      }
    },
    filtered: {
      __template: {
        query: {},
        filter: {}
      },
      query: {},
      filter: {}
    },
    fuzzy: {
      '{field}': {
        'value': '',
        'boost': 1.0,
        'min_similarity': 0.5,
        'prefix_length': 0
      }
    },
    has_child: {
      __template: {
        type: 'TYPE',
        query: {}
      },
      'type': '{type}',
      'score_mode': {
        __one_of: ['none', 'max', 'sum', 'avg']
      },
      '_scope': '',
      'query': {},
      'min_children': 1,
      'max_children': 10
    },
    has_parent: {
      __template: {
        parent_type: 'TYPE',
        query: {}
      },
      'parent_type': '{type}',
      'score_mode': {
        __one_of: ['none', 'score']
      },
      '_scope': '',
      'query': {}
    },
    match_all: {},
    more_like_this: {
      __template: {
        'fields': ['FIELD'],
        'like_text': 'text like this one',
        'min_term_freq': 1,
        'max_query_terms': 12
      },
      fields: ['{field}'],
      like_text: '',
      percent_terms_to_match: 0.3,
      min_term_freq: 2,
      max_query_terms: 25,
      stop_words: [''],
      min_doc_freq: 5,
      max_doc_freq: 100,
      min_word_len: 0,
      max_word_len: 0,
      boost_terms: 1,
      boost: 1.0,
      analyzer: '',
      docs: [{
        _index: "{index}",
        _type: "{type}",
        _id: ""
      }],
      ids: [""]
    },
    mlt: {
      __template: {
        'fields': ['FIELD'],
        'like_text': 'text like this one',
        'min_term_freq': 1,
        'max_query_terms': 12
      },
      __scope_link: ".more_like_this"
    },
    prefix: {
      __template: {
        'FIELD': {
          'value': ''
        }
      },
      '{field}': {
        value: '',
        boost: 1.0
      }
    },
    query_string: {
      __template: {
        'default_field': 'FIELD',
        'query': 'this AND that OR thus'
      },
      query: '',
      default_field: '{field}',
      fields: ['{field}'],
      default_operator: {
        __one_of: ['OR', 'AND']
      },
      analyzer: '',
      allow_leading_wildcard: {
        __one_of: [true, false]
      },
      lowercase_expanded_terms: {
        __one_of: [true, false]
      },
      enable_position_increments: {
        __one_of: [true, false]
      },
      fuzzy_max_expansions: 50,
      fuzzy_min_sim: 0.5,
      fuzzy_prefix_length: 0,
      phrase_slop: 0,
      boost: 1.0,
      analyze_wildcard: {
        __one_of: [false, true]
      },
      auto_generate_phrase_queries: {
        __one_of: [false, true]
      },
      minimum_should_match: '20%',
      lenient: {
        __one_of: [false, true]
      },
      use_dis_max: {
        __one_of: [true, false]
      },
      tie_breaker: 0,
      time_zone: "+1:00"
    },
    simple_query_string: {
      __template: {
        query: "",
        fields: []
      },
      query: "",
      fields: ["{field}"],
      default_operator: {__one_of: ["OR", "AND"]},
      analyzer: "",
      flags: "OR|AND|PREFIX",
      lowercase_expanded_terms: {__one_of: [true, false]},
      locale: "ROOT",
      lenient: {__one_of: [true, false]}
    },
    range: {
      __template: {
        'FIELD': {
          gte: 10,
          lte: 20
        }
      },
      '{field}': {
        __template: {
          gte: 10,
          lte: 20
        },
        gte: 10,
        gt: 10,
        lte: 20,
        lt: 20,
        time_zone: "+1:00",
        boost: 1.0,
        "format": "dd/MM/yyyy||yyyy"

      }
    },
    span_first: {
      __template: {
        'match': {
          'span_term': {
            'FIELD': 'VALUE'
          }
        },
        'end': 3
      },
      match: SPAN_QUERIES
    },
    span_near: {
      __template: {
        'clauses': [
          {
            span_term: {
              'FIELD': {
                'value': 'VALUE'
              }
            }
          }
        ],
        slop: 12,
        in_order: false
      },
      clauses: [
        SPAN_QUERIES
      ],
      slop: 12,
      in_order: {
        __one_of: [false, true]
      },
      collect_payloads: {
        __one_of: [false, true]
      }
    },
    span_term: {
      __template: {
        'FIELD': {
          'value': 'VALUE'
        }
      },
      '{field}': {
        value: '',
        boost: 2.0
      }
    },
    span_not: {
      __template: {
        include: {
          span_term: {
            'FIELD': {
              'value': 'VALUE'
            }
          }
        },
        exclude: {
          span_term: {
            'FIELD': {
              'value': 'VALUE'
            }
          }
        }
      },
      include: SPAN_QUERIES,
      exclude: SPAN_QUERIES
    },
    span_or: {
      __template: {
        clauses: [
          {
            span_term: {
              'FIELD': {
                'value': 'VALUE'
              }
            }
          }
        ]
      },
      clauses: [
        SPAN_QUERIES
      ]
    },
    span_containing: {
      __template: {
        little: {
          span_term: {
            'FIELD': {
              'value': 'VALUE'
            }
          }
        },
        big: {
          span_near: {
            'clauses': [
              {
                span_term: {
                  'FIELD': {
                    'value': 'VALUE'
                  }
                }
              },
              {
                span_term: {
                  'FIELD': {
                    'value': 'VALUE'
                  }
                }
              }
            ],
            "slop": 5,
            "in_order": false
          }
        }
      },
      little: SPAN_QUERIES,
      big: SPAN_QUERIES
    },
    span_within: {
      __template: {
        little: {
          span_term: {
            'FIELD': {
              'value': 'VALUE'
            }
          }
        },
        big: {
          span_near: {
            'clauses': [
              {
                span_term: {
                  'FIELD': {
                    'value': 'VALUE'
                  }
                }
              },
              {
                span_term: {
                  'FIELD': {
                    'value': 'VALUE'
                  }
                }
              }
            ],
            "slop": 5,
            "in_order": false
          }
        }
      },
      little: SPAN_QUERIES,
      big: SPAN_QUERIES
    },
    term: {
      __template: {
        'FIELD': {
          value: 'VALUE'
        }
      },
      '{field}': {
        value: '',
        boost: 2.0
      }
    },
    terms: {
      __template: {
        'FIELD': ['VALUE1', 'VALUE2']
      },
      '{field}': [''],
      minimum_match: 1
    },
    wildcard: {
      __template: {
        'FIELD': {
          value: 'VALUE'
        }
      },
      '{field}': {
        value: '',
        boost: 2.0
      }
    },
    nested: {
      __template: {
        path: 'path_to_nested_doc',
        query: {}
      },
      path: '',
      query: {},
      filter: {},
      score_mode: {
        __one_of: ['avg', 'total', 'max', 'none']
      }
    },
    custom_filters_score: {
      __template: {
        query: {},
        filters: [
          {
            filter: {}
          }
        ]
      },
      query: {},
      filters: [
        {
          filter: {},
          boost: 2.0,
          script: {
            //populated by a global rule
          }
        }
      ],
      score_mode: {
        __one_of: ['first', 'min', 'max', 'total', 'avg', 'multiply']
      },
      max_boost: 2.0,
      params: {},
      lang: ''
    },
    indices: {
      __template: {
        indices: ['INDEX1', 'INDEX2'],
        query: {}
      },
      indices: ['{index}'],
      query: {},
      no_match_query: {
        __scope_link: '.'
      }
    },
    geo_shape: {
      __template: {
        location: {},
        relation: 'within'
      },
      __scope_link: '.filter.geo_shape'
    },
    // js hint gets confused here
    /* jshint -W015 */
    function_score: _.defaults({
        __template: {
          query: {},
          functions: [
            {}
          ]
        },
        query: {},
        filter: {},
        functions: [
          _.defaults(
            {
              filter: {},
              weight: 1.0
            },
            SCORING_FUNCS
          )
        ],
        boost: 1.0,
        boost_mode: {__one_of: ["multiply", "replace", "sum", "avg", "max", "min"]},
        score_mode: {__one_of: ["multiply", "sum", "first", "avg", "max", "min"]},
        max_boost: 10,
        min_score: 1.0
      },
      SCORING_FUNCS
    )

  });
};
