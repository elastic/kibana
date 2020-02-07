/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export default function(api) {
  api.addEndpointDescription('update', {
    data_autocomplete_rules: {
      script: {
        // populated by a global rule
      },
      doc: {},
      upsert: {},
      scripted_upsert: { __one_of: [true, false] },
    },
  });

  api.addEndpointDescription('put_script', {
    methods: ['POST', 'PUT'],
    patterns: ['_scripts/{lang}/{id}', '_scripts/{lang}/{id}/_create'],
    url_components: {
      lang: ['groovy', 'expressions'],
    },
    data_autocomplete_rules: {
      script: '',
    },
  });

  api.addEndpointDescription('termvectors', {
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
}
