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

// Based on https://www.elastic.co/docs/reference/enrich-processor/append-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/attachment
const attachmentProcessorDefinition = {
  attachment: {
    __template: {
      field: '',
    },
    field: '',
    target_field: 'attachment',
    indexed_chars: 100000,
    indexed_chars_field: '',
    max_field_bytes: -1,
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/bytes-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/cef-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/ingest-circle-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/community-id-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/csv-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/convert-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/date-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/date-index-name-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/dissect-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/dot-expand-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/drop-processor
const dropProcessorDefinition = {
  drop: {
    __template: {},
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/enrich-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/fail-processor
const failProcessorDefinition = {
  fail: {
    __template: {
      message: '',
    },
    message: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/fingerprint-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/foreach-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/geoip-processor
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
    download_database_on_pipeline_creation: BOOLEAN,
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/ingest-geo-grid-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/grok-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/gsub-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/htmlstrip-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/inference-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/ip-location-processor
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
    download_database_on_pipeline_creation: BOOLEAN,
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/join-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/json-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/kv-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/lowercase-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/network-direction-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/pipeline-processor
const pipelineProcessorDefinition = {
  pipeline: {
    __template: {
      name: '',
    },
    name: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/recover-failure-document-processor
const recoverFailureDocumentProcessorDefinition = {
  recover_failure_document: {
    __template: {},
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/remove-processor
const removeProcessorDefinition = {
  remove: {
    __template: {
      field: '',
    },
    field: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/redact-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/registered-domain-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/rename-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/reroute-processor
const rerouteProcessorDefinition = {
  reroute: {
    __template: {},
    destination: '',
    dataset: '',
    namespace: '',
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/script-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/set-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/ingest-node-set-security-user-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/split-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/sort-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/trim-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/terminate-processor
const terminateProcessorDefinition = {
  terminate: {
    __template: {},
    ...commonPipelineParams,
  },
};

// Based on https://www.elastic.co/docs/reference/enrich-processor/uppercase-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/urldecode-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/uri-parts-processor
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

// Based on https://www.elastic.co/docs/reference/enrich-processor/user-agent-processor
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
    recoverFailureDocumentProcessorDefinition,
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
