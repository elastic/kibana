/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecDefinitionsService } from '../../../services';
import { BOOLEAN } from './shared';

const commonPipelineParams = {
  on_failure: [],
  ignore_failure: {
    __one_of: [false, true],
  },
  if: '',
  tag: '',
  description: '',
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/attachment.html
const attachmentProcessorDefinition = {
  attachment: {
    __template: {
      field: '',
    },
    field: '',
    target_field: 'attachment',
    indexed_chars: 100000,
    indexed_chars_field: '',
    properties: [''],
    ignore_missing: {
      __one_of: [false, true],
    },
    remove_binary: {
      __one_of: [false, true],
    },
    resource_name: '',
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/cef-processor.html
const cefProcessorDefinition = {
  cef: {
    __template: {
      field: '',
    },
    field: '',
    target_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ignore_empty_values: BOOLEAN,
    timezone: 'UTC',
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/community-id-processor.html
const communityIdProcessorDefinition = {
  community_id: {
    __template: {},
    source_ip: 'source.ip',
    source_port: 'source.port',
    destination_ip: 'destination.ip',
    destination_port: 'destination.port',
    iana_number: 'network.iana_number',
    icmp_type: 'icmp.type',
    icmp_code: 'icmp.code',
    transport: '',
    target_field: 'network.community_id',
    seed: 0,
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
    trim: BOOLEAN,
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
    override: BOOLEAN,
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/fingerprint-processor.html
const fingerprintProcessorDefinition = {
  fingerprint: {
    __template: {
      fields: [],
    },
    fields: [],
    target_field: 'fingerprint',
    salt: '',
    method: {
      __one_of: ['SHA-1', 'SHA-256', 'SHA-512', 'MD5', 'MurmurHash3'],
    },
    ignore_missing: {
      __one_of: [false, true],
    },
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
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest-geo-grid-processor.html
const geoGridProcessorDefinition = {
  geo_grid: {
    __template: {
      field: '',
      tile_type: '',
    },
    field: '',
    tile_type: {
      __one_of: ['geotile', 'geohex', 'geohash'],
    },
    target_field: '',
    target_format: {
      __one_of: ['GeoJSON', 'WKT'],
    },
    parent_field: '',
    children_field: '',
    non_children_field: '',
    precision_field: '',
    ignore_missing: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/ip-location-processor.html
const ipLocationProcessorDefinition = {
  ip_location: {
    __template: {
      field: '',
    },
    field: '',
    target_field: 'ip_location',
    database_file: '',
    properties: [''],
    ignore_missing: {
      __one_of: [false, true],
    },
    first_only: BOOLEAN,
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/network-direction-processor.html
const networkDirectionProcessorDefinition = {
  network_direction: {
    __template: {
      internal_networks: [],
    },
    source_ip: 'source.ip',
    destination_ip: 'destination.ip',
    target_field: 'network.direction',
    internal_networks: [],
    internal_networks_field: '',
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/redact-processor.html
const redactProcessorDefinition = {
  redact: {
    __template: {
      field: '',
      patterns: [],
    },
    field: '',
    patterns: [],
    pattern_definitions: {},
    prefix: '<',
    suffix: '>',
    ignore_missing: {
      __one_of: [false, true],
    },
    skip_if_unlicensed: {
      __one_of: [false, true],
    },
    trace_redact: {
      __one_of: [false, true],
    },
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/registered-domain-processor.html
const registeredDomainProcessorDefinition = {
  registered_domain: {
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/reroute-processor.html
const rerouteProcessorDefinition = {
  reroute: {
    __template: {},
    destination: '',
    dataset: '',
    namespace: '',
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
    override: BOOLEAN,
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/terminate-processor.html
const terminateProcessorDefinition = {
  terminate: {
    __template: {},
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

// Based on https://www.elastic.co/guide/en/elasticsearch/reference/master/uri-parts-processor.html
const uriPartsProcessorDefinition = {
  uri_parts: {
    __template: {
      field: '',
    },
    field: '',
    target_field: 'url',
    keep_original: BOOLEAN,
    remove_if_successful: {
      __one_of: [false, true],
    },
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
    ...commonPipelineParams,
  },
};

const processorDefinition = {
  __one_of: [
    appendProcessorDefinition,
    attachmentProcessorDefinition,
    bytesProcessorDefinition,
    cefProcessorDefinition,
    circleProcessorDefinition,
    communityIdProcessorDefinition,
    convertProcessorDefinition,
    csvProcessorDefinition,
    dateProcessorDefinition,
    dateIndexNameProcessorDefinition,
    dissectProcessorDefinition,
    dotExpanderProcessorDefinition,
    dropProcessorDefinition,
    enrichProcessorDefinition,
    failProcessorDefinition,
    fingerprintProcessorDefinition,
    foreachProcessorDefinition,
    geoGridProcessorDefinition,
    geoipProcessorDefinition,
    grokProcessorDefinition,
    gsubProcessorDefinition,
    htmlStripProcessorDefinition,
    inferenceProcessorDefinition,
    ipLocationProcessorDefinition,
    joinProcessorDefinition,
    jsonProcessorDefinition,
    kvProcessorDefinition,
    lowercaseProcessorDefinition,
    networkDirectionProcessorDefinition,
    pipelineProcessorDefinition,
    redactProcessorDefinition,
    registeredDomainProcessorDefinition,
    removeProcessorDefinition,
    renameProcessorDefinition,
    rerouteProcessorDefinition,
    scriptProcessorDefinition,
    setProcessorDefinition,
    setSecurityUserProcessorDefinition,
    sortProcessorDefinition,
    splitProcessorDefinition,
    terminateProcessorDefinition,
    trimProcessorDefinition,
    uppercaseProcessorDefinition,
    uriPartsProcessorDefinition,
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
