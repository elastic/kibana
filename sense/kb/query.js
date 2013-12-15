SPAN_QUERIES = {
   // TODO add one_of for objects
   span_first: {__scope_link: ".query.span_first"},
   span_near: {__scope_link: ".query.span_near"},
   span_or: {__scope_link: ".query.span_or"},
   span_not: {__scope_link: ".query.span_not"},
   span_term: {__scope_link: ".query.span_term"}
};

sense.kb.addGlobalAutocompleteRules("query", {
   match: { __template: { "FIELD": "TEXT" },
      "$FIELD$": {
         "query": "",
         "operator": { __one_of: ["and" , "or"]},
         "type": { __one_of: [ "phrase", "phrase_prefix", "boolean"]},
         "max_expansions": 10,
         "analyzer": "",
         "fuzziness": 1.0,
         "prefix_length": 1
      }  },
   match_phrase: { __template: { "FIELD": "PHRASE" },
      "$FIELD$": {
         query: "",
         analyzer: ""
      }  },
   match_phrase_prefix: { __template: { "FIELD": "PREFIX" },
      "$FIELD$": {
         query: "",
         analyzer: "",
         max_expansions: 10,
         prefix_length: 1,
         fuzziness: 0.1
      }  },
   multi_match: { __template: { "query": "", "fields": [] },
      query: "",
      fields: ["$FIELD$"],
      use_dis_max: { __template: true, __one_of: [ true, false ]},
      tie_breaker: 0.0
   },
   bool: {
      must: [
         { __scope_link: "GLOBAL.query"}
      ],
      must_not: [
         { __scope_link: "GLOBAL.query"}
      ],
      should: [
         { __scope_link: "GLOBAL.query" }
      ],
      minimum_number_should_match: 1,
      boost: 1.0
   },
   boosting: {
      positive: { __scope_link: ".query" },
      negative: { __scope_link: ".query" },
      negative_boost: 0.2
   },
   ids: { type: "", values: [] },
   custom_score: {
      __template: { query: {}, script: ""},
      query: {},
      script: "",
      params: {},
      lang: "mvel"
   },
   custom_boost_factor: {
      __template: { query: {}, boost_factor: 1.1 },
      query: {},
      boost_factor: 1.1
   },
   constant_score: {
      __template: { filter: {}, boost: 1.2 },
      query: {},
      filter: {},
      boost: 1.2
   },
   dis_max: {
      __template: { tie_breaker: 0.7, boost: 1.2, queries: []},
      tie_breaker: 0.7,
      boost: 1.2,
      queries: [
         { __scope_link: ".query"}
      ]
   },
   field: {
      "$FIELD$": {
         query: "", boost: 2.0,
         enable_position_increments: { __template: false, __one_of: [ true, false ]}
      } },
   filtered: {
      __template: {
         query: {},
         filter: {}
      },
      query: {},
      filter: {}
   },
   fuzzy_like_this: {
      fields: [],
      like_text: "",
      max_query_terms: 12
   },
   flt: {
      __scope_link: ".query.fuzzy_like_this"
   },
   fuzzy: {
      "$FIELD$": {
         "value": "",
         "boost": 1.0,
         "min_similarity": 0.5,
         "prefix_length": 0
      }
   },
   has_child: {
      "type": "$TYPE$",
      "score_type": { __one_of: ["none", "max", "sum", "avg"]},
      "_scope": "",
      "query": {
      }
   },
   has_parent: {
      "parent_type": "$TYPE$",
      "score_type": { __one_of: ["none", "score"]},
      "_scope": "",
      "query": {
      }
   },
   match_all: {},
   more_like_this: {
      __template: {
         "fields": ["FIELD"],
         "like_text": "text like this one",
         "min_term_freq": 1,
         "max_query_terms": 12
      },
      fields: [ "$FIELD$ "],
      like_text: "",
      percent_terms_to_match: 0.3,
      min_term_freq: 2,
      max_query_terms: 25,
      stop_words: [""],
      min_doc_freq: 5,
      max_doc_freq: 100,
      min_word_len: 0,
      max_word_len: 0,
      boost_terms: 1,
      boost: 1.0,
      analyzer: ""
   },
   more_like_this_field: {
      __template: {
         "FIELD": {
            "like_text": "text like this one",
            "min_term_freq": 1,
            "max_query_terms": 12
         } },
      "$FIELD$": {
         like_text: "",
         percent_terms_to_match: 0.3,
         min_term_freq: 2,
         max_query_terms: 25,
         stop_words: [""],
         min_doc_freq: 5,
         max_doc_freq: 100,
         min_word_len: 0,
         max_word_len: 0,
         boost_terms: 1,
         boost: 1.0,
         analyzer: ""
      }
   },
   prefix: {
      __template: {
         "FIELD": { "value": "" }
      },
      "$FIELD$": {
         value: "",
         boost: 1.0
      }
   },
   query_string: {
      __template: {
         "default_field": "FIELD",
         "query": "this AND that OR thus"
      },
      query: "",
      default_field: "$FIELD$",
      fields: ["$FIELD$"],
      default_operator: { __one_of: ["OR", "AND"] },
      analyzer: "",
      allow_leading_wildcard: { __one_of: [ true, false]},
      lowercase_expanded_terms: { __one_of: [ true, false]},
      enable_position_increments: { __one_of: [ true, false]},
      fuzzy_max_expansions: 50,
      fuzzy_min_sim: 0.5,
      fuzzy_prefix_length: 0,
      phrase_slop: 0,
      boost: 1.0,
      analyze_wildcard: { __one_of: [ false, true ]},
      auto_generate_phrase_queries: { __one_of: [ false, true ]},
      minimum_should_match: "20%",
      lenient: { __one_of: [ false, true ]},
      use_dis_max: { __one_of: [ true, false]},
      tie_breaker: 0
   },
   range: {
      __template: {
         "FIELD": {
            from: 10,
            to: 20
         }
      },
      "$FIELD$": {
         __template: { from: 10, to: 20},
         from: 1,
         to: 20,
         include_lower: { __one_of: [ true, false]},
         include_upper: { __one_of: [ true, false]},
         boost: 1.0
      }
   },
   span_first: {
      __template: {
         "match": {
            "span_term": { "FIELD": "VALUE" }
         },
         "end": 3
      },
      match: SPAN_QUERIES
   },
   span_near: {
      __template: {
         "clauses": [
            { span_term: { "FIELD": { "value": "VALUE"} } }
         ],
         slop: 12,
         in_order: false
      },
      clauses: [
         SPAN_QUERIES
      ],
      slop: 12,
      in_order: {__one_of: [ false, true ]},
      collect_payloads: {__one_of: [ false, true ]}
   },
   span_term: {
      __template: { "FIELD": { "value": "VALUE"}},
      "$FIELD$": {
         value: "",
         boost: 2.0
      }
   },
   span_not: {
      __template: {
         include: {
            span_term: { "FIELD": { "value": "VALUE"} }
         },
         exclude: {
            span_term: { "FIELD": { "value": "VALUE"} }
         }
      },
      include: SPAN_QUERIES,
      exclude: SPAN_QUERIES
   },
   span_or: {
      __template: {
         clauses: [
            { span_term: { "FIELD": { "value": "VALUE"} } }
         ]
      },
      clauses: [
         SPAN_QUERIES
      ]
   },
   term: {
      __template: { "FIELD": { value: "VALUE" }},
      "$FIELD$": {
         value: "",
         boost: 2.0
      }
   },
   terms: {
      __template: {
         "FIELD": [ "VALUE1", "VALUE2"]
      },
      "$FIELD$": [ "" ],
      minimum_match: 1
   },
   top_children: {
      __template: {
         type: "CHILD_TYPE",
         query: {}
      },
      type: "$CHILD_TYPE$",
      query: { },
      score: { __one_of: [ "max", "sum", "avg"] },
      factor: 5,
      incremental_factor: 2
   },
   wildcard: {
      __template: {
         "FIELD": { value: "VALUE"}
      },
      "$FIELD$": { value: "", boost: 2.0 }
   },
   nested: {
      __template: {
         path: "path_to_nested_doc",
         query: {}
      },
      path: "",
      query: {},
      filter: {},
      score_mode: { __one_of: ["avg", "total", "max", "none"]}
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
         { filter: {}, boost: 2.0, script: ""}
      ],
      score_mode: { __one_of: [ "first", "min", "max", "total", "avg", "multiply"] },
      max_boost: 2.0,
      params: {},
      lang: ""
   },
   indices: {
      __template: {
         indices: ["INDEX1", "INDEX2"],
         query: {}
      },
      indices: ["$INDEX$"],
      query: {},
      no_match_query: { __scope_link: ".query"}
   },
   geo_shape: {
      __template: {
         location: {},
         relation: "within"
      },
      __scope_link: ".filter.geo_shape"
   }

});