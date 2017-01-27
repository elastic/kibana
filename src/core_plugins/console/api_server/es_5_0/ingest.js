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

const pipelineDefinition = {
  description: '',
  processors: [
    {
      __one_of: [
        appendProcessorDefinition,
        convertProcessorDefinition
      ] // TODO: add more processor definitions
    }
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
