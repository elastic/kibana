module.exports = function (api) {
  api.addEndpointDescription('_get_doc', {
    methods: ['GET'],
    patterns: [
      "{index}/{type}/{id}"
    ],
    url_params: {
      "version": 1,
      "routing": "",
      "parent": "",
      "_source": "",
      "_source_exclude": "",
      "_source_include": ""
    }
  });
  api.addEndpointDescription('_get_doc_source', {
    methods: ['GET'],
    patterns: [
      "{index}/{type}/{id}/_source"
    ],
    url_params: {
      "version": 1,
      "routing": "",
      "parent": "",
      "_source_exclude": "",
      "_source_include": ""
    }
  });
  api.addEndpointDescription('_delete_doc', {
    methods: ['DELETE'],
    patterns: [
      "{index}/{type}/{id}"
    ],
    url_params: {
      "version": 1,
      "version_type": ["external", "internal"],
      "routing": "",
      "parent": ""
    }
  });
  api.addEndpointDescription('index_doc', {
    methods: ['PUT', 'POST'],
    patterns: [
      "{index}/{type}/{id}"
    ],
    url_params: {
      "version": 1,
      "version_type": ["external", "internal"],
      "op_type": ["create"],
      "routing": "",
      "parent": "",
      "timestamp": "",
      "ttl": "5m",
      "consistency": ["qurom", "one", "all"],
      "refresh": "__flag__",
      "timeout": "1m"
    }
  });
  api.addEndpointDescription('create_doc', {
    methods: ['PUT', 'POST'],
    patterns: [
      "{index}/{type}/{id}/_create"
    ],
    url_params: {
      "version": 1,
      "version_type": ["external", "internal"],
      "routing": "",
      "parent": "",
      "timestamp": "",
      "ttl": "5m",
      "consistency": ["qurom", "one", "all"],
      "refresh": "__flag__",
      "timeout": "1m"
    }
  });
  api.addEndpointDescription('index_doc_no_id', {
    methods: ['POST'],
    patterns: [
      "{index}/{type}"
    ],
    url_params: {
      "version": 1,
      "version_type": ["external", "internal"],
      "routing": "",
      "parent": "",
      "timestamp": "",
      "ttl": "5m",
      "consistency": ["qurom", "one", "all"],
      "refresh": "__flag__",
      "timeout": "1m"
    }
  });

  api.addEndpointDescription('_update', {
    methods: ['POST'],
    patterns: [
      "{index}/{type}/{id}/_update"
    ],
    url_params: {
      "version": 1,
      "version_type": ["force", "internal"],
      "routing": "",
      "parent": "",
      "timestamp": "",
      "consistency": ["qurom", "one", "all"],
      "refresh": "__flag__",
      "timeout": "1m",
      "retry_on_conflict": 3,
      "fields": ""
    },
    data_autocomplete_rules: {
      "script": {
        // populated by a global rule
      },
      "doc": {},
      "upsert": {},
      "scripted_upsert": { __one_of: [true, false] }
    }

  });

  api.addEndpointDescription('_put_script', {
    methods: ['POST', 'PUT'],
    patterns: [
      "_scripts/{lang}/{id}",
      "_scripts/{lang}/{id}/_create"
    ],
    url_components: {
      "lang": [
        "groovy",
        "expressions"
      ]
    },
    data_autocomplete_rules: {
      "script": ""
    }
  });

  api.addEndpointDescription('_termvectors', {
    methods: ['GET', 'POST'],
    patterns: [
      "{index}/{type}/_termvectors"
    ],
    priority: 10, // collision with get doc
    url_params: {
      "fields": "",
      "offsets": "__flag__",
      "payloads": "__flag__",
      "positions": "__flag__",
      "term_statistics": "__flag__",
      "field_statistics": "__flag__",
      "routing": "",
      "version": 1,
      "version_type": ["external", "external_gt", "external_gte", "force", "internal"],
      "parent": "",
      "preference": ""
    },
    data_autocomplete_rules: {
      fields: [
        "{field}"
      ],
      offsets: { __one_of: [false, true] },
      payloads: { __one_of: [false, true] },
      positions: { __one_of: [false, true] },
      term_statistics: { __one_of: [true, false] },
      field_statistics: { __one_of: [false, true] },
      per_field_analyzer: {
        __template: { "FIELD": "" },
        "{field}": ""
      },
      routing: "",
      version: 1,
      version_type: ["external", "external_gt", "external_gte", "force", "internal"],
      doc: {},
      filter: { // TODO: Exclude from global filter rules
        "max_num_terms": 1,
        "min_term_freq": 1,
        "max_term_freq": 1,
        "min_doc_freq": 1,
        "max_doc_freq": 1,
        "min_word_length": 1,
        "max_word_length": 1
      }
    }
  });
  api.addEndpointDescription('_termvectors_id', {
    methods: ['GET', 'POST'],
    patterns: [
      "{index}/{type}/{id}/_termvectors"
    ],
    url_params: {
      "fields": "",
      "offsets": "__flag__",
      "payloads": "__flag__",
      "positions": "__flag__",
      "term_statistics": "__flag__",
      "field_statistics": "__flag__",
      "routing": "",
      "version": 1,
      "version_type": ["external", "external_gt", "external_gte", "force", "internal"],
      "parent": "",
      "preference": "",
      "dfs": "__flag__"
    },
    data_autocomplete_rules: {
      fields: [
        "{field}"
      ],
      offsets: { __one_of: [false, true] },
      payloads: { __one_of: [false, true] },
      positions: { __one_of: [false, true] },
      term_statistics: { __one_of: [true, false] },
      field_statistics: { __one_of: [false, true] },
      dfs: { __one_of: [true, false] },
      per_field_analyzer: {
        __template: { "FIELD": "" },
        "{field}": ""
      },
      routing: "",
      version: 1,
      version_type: ["external", "external_gt", "external_gte", "force", "internal"],
      filter: { // TODO: Exclude from global filter rules
        "max_num_terms": 1,
        "min_term_freq": 1,
        "max_term_freq": 1,
        "min_doc_freq": 1,
        "max_doc_freq": 1,
        "min_word_length": 1,
        "max_word_length": 1
      }
    }
  });
};
