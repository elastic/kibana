/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecDefinitionsService } from '../../../services';

export const document = (specService: SpecDefinitionsService) => {
  specService.addEndpointDescription('update', {
    data_autocomplete_rules: {
      script: {
        // populated by a global rule
      },
      doc: {},
      upsert: {},
      scripted_upsert: { __one_of: [true, false] },
    },
  });

  specService.addEndpointDescription('put_script', {
    methods: ['POST', 'PUT'],
    patterns: ['_scripts/{lang}/{id}', '_scripts/{lang}/{id}/_create'],
    url_components: {
      lang: ['groovy', 'expressions'],
    },
    data_autocomplete_rules: {
      script: '',
    },
  });

  specService.addEndpointDescription('termvectors', {
    data_autocomplete_rules: {
      fields: ['{field}'],
      offsets: { __one_of: [false, true] },
      payloads: { __one_of: [false, true] },
      positions: { __one_of: [false, true] },
      term_statistics: { __one_of: [true, false] },
      field_statistics: { __one_of: [false, true] },
      per_field_analyzer: {
        __template: { FIELD: '' },
        '{field}': '',
      },
      routing: '',
      version: 1,
      version_type: ['external', 'external_gt', 'external_gte', 'force', 'internal'],
      doc: {},
      filter: {
        // TODO: Exclude from global filter rules
        max_num_terms: 1,
        min_term_freq: 1,
        max_term_freq: 1,
        min_doc_freq: 1,
        max_doc_freq: 1,
        min_word_length: 1,
        max_word_length: 1,
      },
    },
  });
};
