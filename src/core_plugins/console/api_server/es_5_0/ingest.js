// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/append-processor.html
const appendProcessorDefinition = {
  append: {
    __template: {
      field: '',
      value: []
    },
    field: '',
    value: []
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/convert-processor.html
const convertProcessorDefinition = {
  convert: {
    __template: {
      field: '',
      type: ''
    },
    field: '',
    type: {
      __one_of: [ 'integer', 'float', 'string', 'boolean', 'auto' ]
    },
    target_field: '',
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/date-processor.html
const dateProcessorDefinition = {
  date: {
    __template: {
      field: '',
      formats: []
    },
    field: '',
    target_field: '@timestamp',
    formats: [],
    timezone: 'UTC',
    locale: 'ENGLISH'
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/date-index-name-processor.html
const dateIndexNameProcessorDefinition = {
  date_index_name: {
    __template: {
      field: '',
      date_rounding: ''
    },
    field: '',
    date_rounding: {
      __one_of: [ 'y', 'M', 'w', 'd', 'h', 'm', 's' ]
    },
    date_formats: [],
    timezone: 'UTC',
    locale: 'ENGLISH',
    index_name_format: 'yyyy-MM-dd'
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/fail-processor.html
const failProcessorDefinition = {
  fail: {
    __template: {
      message: ''
    },
    message: ''
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/foreach-processor.html
const foreachProcessorDefinition = {
  foreach: {
    __template: {
      field: '',
      processor: {}
    },
    field: '',
    processor: {
      __scope_link: '_processor'
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/grok-processor.html
const grokProcessorDefinition = {
  grok: {
    __template: {
      field: '',
      patterns: []
    },
    field: '',
    patterns: [],
    pattern_definitions: {},
    trace_match: {
      __one_of: [ false, true ]
    },
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/gsub-processor.html
const gsubProcessorDefinition = {
  gsub: {
    __template: {
      field: '',
      pattern: '',
      replacement: ''
    },
    field: '',
    pattern: '',
    replacement: ''
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/join-processor.html
const joinProcessorDefinition = {
  join: {
    __template: {
      field: '',
      separator: ''
    },
    field: '',
    separator: ''
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/json-processor.html
const jsonProcessorDefinition = {
  json: {
    __template: {
      field: ''
    },
    field: '',
    target_field: '',
    add_to_root: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/kv-processor.html
const kvProcessorDefinition = {
  kv: {
    __template: {
      field: '',
      field_split: '',
      value_split: ''
    },
    field: '',
    field_split: '',
    value_split: '',
    target_field: '',
    include_keys: [],
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/lowercase-processor.html
const lowercaseProcessorDefinition = {
  lowercase: {
    __template: {
      field: ''
    },
    field: '',
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/remove-processor.html
const removeProcessorDefinition = {
  remove: {
    __template: {
      field: ''
    },
    field: ''
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/rename-processor.html
const renameProcessorDefinition = {
  rename: {
    __template: {
      field: '',
      target_field: ''
    },
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/script-processor.html
const scriptProcessorDefinition = {
  script: {
    __template: {},
    lang: 'painless',
    file: '',
    id: '',
    inline: '',
    params: {}
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/set-processor.html
const setProcessorDefinition = {
  set: {
    __template: {
      field: '',
      value: ''
    },
    field: '',
    value: '',
    override: {
      __one_of: [ true, false ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/split-processor.html
const splitProcessorDefinition = {
  split: {
    __template: {
      field: '',
      separator: ''
    },
    field: '',
    separator: '',
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/sort-processor.html
const sortProcessorDefinition = {
  sort: {
    __template: {
      field: ''
    },
    field: '',
    order: 'asc'
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/trim-processor.html
const trimProcessorDefinition = {
  trim: {
    __template: {
      field: ''
    },
    field: '',
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/uppercase-processor.html
const uppercaseProcessorDefinition = {
  uppercase: {
    __template: {
      field: ''
    },
    field: '',
    ignore_missing: {
      __one_of: [ false, true ]
    }
  }
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/dot-expand-processor.html
const dotExpanderProcessorDefinition = {
  dot_expander: {
    __template: {
      field: ''
    },
    field: '',
    path: ''
  }
};

const processorDefinition = {
  __one_of: [
    appendProcessorDefinition,
    convertProcessorDefinition,
    dateProcessorDefinition,
    dateIndexNameProcessorDefinition,
    failProcessorDefinition,
    foreachProcessorDefinition,
    grokProcessorDefinition,
    gsubProcessorDefinition,
    joinProcessorDefinition,
    jsonProcessorDefinition,
    kvProcessorDefinition,
    lowercaseProcessorDefinition,
    removeProcessorDefinition,
    renameProcessorDefinition,
    scriptProcessorDefinition,
    setProcessorDefinition,
    splitProcessorDefinition,
    sortProcessorDefinition,
    trimProcessorDefinition,
    uppercaseProcessorDefinition,
    dotExpanderProcessorDefinition
  ]
};

const pipelineDefinition = {
  description: '',
  processors: [
    processorDefinition
  ],
  version: 123,
};

const simulateUrlParamsDefinition = {
  "verbose": "__flag__"
};

module.exports = function (api) {

  // Note: this isn't an actual API endpoint. It exists so the forEach processor's "processor" field
  // may recursively use the autocomplete rules for any processor.
  api.addEndpointDescription('_processor', {
    data_autocomplete_rules: processorDefinition
  });

  api.addEndpointDescription('_put_ingest_pipeline', {
    methods: ['PUT'],
    patterns: [
      '_ingest/pipeline/{name}'
    ],
    data_autocomplete_rules: pipelineDefinition
  });

  api.addEndpointDescription('_get_ingest_pipeline', {
    methods: ['GET'],
    patterns: [
      '_ingest/pipeline/{id}'
    ]
  });

  api.addEndpointDescription('_delete_ingest_pipeline', {
    methods: ['DELETE'],
    patterns: [
      '_ingest/pipeline/{id}'
    ]
  });

  api.addEndpointDescription('_simulate_new_ingest_pipeline', {
    methods: ['POST'],
    patterns: [
      '_ingest/pipeline/_simulate'
    ],
    url_params: simulateUrlParamsDefinition,
    data_autocomplete_rules: {
      pipeline: pipelineDefinition,
      docs: [
      ]
    }
  });

  api.addEndpointDescription('_simulate_existing_ingest_pipeline', {
    methods: ['POST'],
    patterns: [
      '_ingest/pipeline/{name}/_simulate'
    ],
    url_params: simulateUrlParamsDefinition,
    data_autocomplete_rules: {
      docs: [
      ]
    }
  });
};
