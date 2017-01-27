const processorDefinition = {
  __one_of: [
    appendProcessorDefinition,
    convertProcessorDefinition,
    dateProcessorDefinition,
    dateIndexNameProcessorDefinition,
    failProcessorDefinition,
    foreachProcessorDefinition,
    grokProcessorDefinition
  ] // TODO: add more processor definitions
};

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
      processor: ''
    },
    field: '',
    processor: processorDefinition
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
