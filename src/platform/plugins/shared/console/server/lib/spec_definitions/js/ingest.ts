/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecDefinitionsService } from '../../../services';

const commonPipelineParams = {
  on_failure: [],
  ignore_failure: {
    __one_of: [false, true],
  },
  if: '',
  tag: '',
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/append-processor.html
const appendProcessorDefinition = {
  append: {
    __template: {
      field: '',
      value: [],
    },
    field: '',
    value: [],
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/bytes-processor.html
const bytesProcessorDefinition = {
  bytes: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest-circle-processor.html
const circleProcessorDefinition = {
  circle: {
    __template: {
      field: '',
      error_distance: '',
      shape_type: '',
    },
    field: '',
    target_field: '',
    error_distance: '',
    shape_type: {
      __one_of: ['geo_shape', 'shape'],
    },
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/csv-processor.html
const csvProcessorDefinition = {
  csv: {
    __template: {
      field: '',
      target_fields: [''],
    },
    field: '',
    target_fields: [''],
    separator: '',
    quote: '',
    empty_value: '',
    trim: {
      __one_of: [true, false],
    },
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/convert-processor.html
const convertProcessorDefinition = {
  convert: {
    __template: {
      field: '',
      type: '',
    },
    field: '',
    type: {
      __one_of: ['integer', 'float', 'string', 'boolean', 'auto'],
    },
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/date-processor.html
const dateProcessorDefinition = {
  date: {
    __template: {
      field: '',
      formats: [],
    },
    field: '',
    target_field: '@timestamp',
    formats: [],
    timezone: 'UTC',
    locale: 'ENGLISH',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/date-index-name-processor.html
const dateIndexNameProcessorDefinition = {
  date_index_name: {
    __template: {
      field: '',
      date_rounding: '',
    },
    field: '',
    date_rounding: {
      __one_of: ['y', 'M', 'w', 'd', 'h', 'm', 's'],
    },
    date_formats: [],
    timezone: 'UTC',
    locale: 'ENGLISH',
    index_name_format: 'yyyy-MM-dd',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/dissect-processor.html
const dissectProcessorDefinition = {
  dissect: {
    __template: {
      field: '',
      pattern: '',
    },
    field: '',
    pattern: '',
    append_separator: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/dot-expand-processor.html
const dotExpanderProcessorDefinition = {
  dot_expander: {
    __template: {
      field: '',
    },
    field: '',
    path: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/drop-processor.html
const dropProcessorDefinition = {
  drop: {
    __template: {},
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/enrich-processor.html
const enrichProcessorDefinition = {
  enrich: {
    __template: {
      policy_name: '',
      field: '',
      target_field: '',
    },
    policy_name: '',
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    override: {
      __one_of: [true, false],
    },
    max_matches: 1,
    shape_relation: 'INTERSECTS',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/fail-processor.html
const failProcessorDefinition = {
  fail: {
    __template: {
      message: '',
    },
    message: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/foreach-processor.html
const foreachProcessorDefinition = {
  foreach: {
    __template: {
      field: '',
      processor: {},
    },
    field: '',
    processor: {
      __scope_link: '_processor',
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/geoip-processor.html
const geoipProcessorDefinition = {
  geoip: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    database_file: '',
    properties: [''],
    ignore_missing: {
      __one_of: [false, true],
    },
    first_only: {
      __one_of: [false, true],
    },
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/grok-processor.html
const grokProcessorDefinition = {
  grok: {
    __template: {
      field: '',
      patterns: [],
    },
    field: '',
    patterns: [],
    pattern_definitions: {},
    trace_match: {
      __one_of: [false, true],
    },
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/gsub-processor.html
const gsubProcessorDefinition = {
  gsub: {
    __template: {
      field: '',
      pattern: '',
      replacement: '',
    },
    field: '',
    pattern: '',
    replacement: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/htmlstrip-processor.html
const htmlStripProcessorDefinition = {
  html_strip: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/inference-processor.html
const inferenceProcessorDefinition = {
  inference: {
    __template: {
      model_id: '',
      inference_config: {},
      field_mappings: {},
    },
    target_field: '',
    model_id: '',
    field_mappings: {
      __template: {},
    },
    inference_config: {
      regression: {
        __template: {},
        results_field: '',
      },
      classification: {
        __template: {},
        results_field: '',
        num_top_classes: 2,
        top_classes_results_field: '',
      },
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/join-processor.html
const joinProcessorDefinition = {
  join: {
    __template: {
      field: '',
      separator: '',
    },
    field: '',
    separator: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/json-processor.html
const jsonProcessorDefinition = {
  json: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    add_to_root: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/kv-processor.html
const kvProcessorDefinition = {
  kv: {
    __template: {
      field: '',
      field_split: '',
      value_split: '',
    },
    field: '',
    field_split: '',
    value_split: '',
    target_field: '',
    include_keys: [],
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/lowercase-processor.html
const lowercaseProcessorDefinition = {
  lowercase: {
    __template: {
      field: '',
    },
    field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/pipeline-processor.html
const pipelineProcessorDefinition = {
  pipeline: {
    __template: {
      name: '',
    },
    name: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/remove-processor.html
const removeProcessorDefinition = {
  remove: {
    __template: {
      field: '',
    },
    field: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/rename-processor.html
const renameProcessorDefinition = {
  rename: {
    __template: {
      field: '',
      target_field: '',
    },
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/script-processor.html
const scriptProcessorDefinition = {
  script: {
    __template: {},
    lang: 'painless',
    file: '',
    id: '',
    source: '',
    params: {},
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/set-processor.html
const setProcessorDefinition = {
  set: {
    __template: {
      field: '',
      value: '',
    },
    field: '',
    value: '',
    override: {
      __one_of: [true, false],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest-node-set-security-user-processor.html
const setSecurityUserProcessorDefinition = {
  set_security_user: {
    __template: {
      field: '',
    },
    field: '',
    properties: [''],
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/split-processor.html
const splitProcessorDefinition = {
  split: {
    __template: {
      field: '',
      separator: '',
    },
    field: '',
    separator: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/sort-processor.html
const sortProcessorDefinition = {
  sort: {
    __template: {
      field: '',
    },
    field: '',
    order: 'asc',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/trim-processor.html
const trimProcessorDefinition = {
  trim: {
    __template: {
      field: '',
    },
    field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/uppercase-processor.html
const uppercaseProcessorDefinition = {
  uppercase: {
    __template: {
      field: '',
    },
    field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/urldecode-processor.html
const urlDecodeProcessorDefinition = {
  urldecode: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/user-agent-processor.html
const userAgentProcessorDefinition = {
  user_agent: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    regex_file: '',
    properties: [''],
    ignore_missing: {
      __one_of: [false, true],
    },
  },
};

const processorDefinition = {
  __one_of: [
    appendProcessorDefinition,
    bytesProcessorDefinition,
    csvProcessorDefinition,
    circleProcessorDefinition,
    convertProcessorDefinition,
    dateProcessorDefinition,
    dateIndexNameProcessorDefinition,
    dissectProcessorDefinition,
    dotExpanderProcessorDefinition,
    dropProcessorDefinition,
    enrichProcessorDefinition,
    failProcessorDefinition,
    foreachProcessorDefinition,
    geoipProcessorDefinition,
    grokProcessorDefinition,
    gsubProcessorDefinition,
    htmlStripProcessorDefinition,
    inferenceProcessorDefinition,
    joinProcessorDefinition,
    jsonProcessorDefinition,
    kvProcessorDefinition,
    lowercaseProcessorDefinition,
    pipelineProcessorDefinition,
    removeProcessorDefinition,
    renameProcessorDefinition,
    scriptProcessorDefinition,
    setProcessorDefinition,
    setSecurityUserProcessorDefinition,
    splitProcessorDefinition,
    sortProcessorDefinition,
    trimProcessorDefinition,
    uppercaseProcessorDefinition,
    urlDecodeProcessorDefinition,
    userAgentProcessorDefinition,
  ],
};

const pipelineDefinition = {
  description: '',
  processors: [processorDefinition],
  version: 123,
};

export const ingest = (specService: SpecDefinitionsService) => {
  // Note: this isn't an actual API endpoint. It exists so the forEach processor's "processor" field
  // may recursively use the autocomplete rules for any processor.
  specService.addEndpointDescription('_processor', {
    data_autocomplete_rules: processorDefinition,
  });

  specService.addEndpointDescription('ingest.put_pipeline', {
    methods: ['PUT'],
    patterns: ['_ingest/pipeline/{id}'],
    data_autocomplete_rules: pipelineDefinition,
  });

  specService.addEndpointDescription('ingest.simulate', {
    data_autocomplete_rules: {
      pipeline: pipelineDefinition,
      docs: [],
    },
  });
};
