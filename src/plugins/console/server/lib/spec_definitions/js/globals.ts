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
import { SpecDefinitionsService } from '../../../services';

/* eslint-disable @typescript-eslint/camelcase */
const highlightOptions = {
  boundary_chars: {},
  boundary_max_scan: 20,
  boundary_scanner: {
    __one_of: ['chars', 'sentence', 'word'],
  },
  boundary_scanner_locale: {},
  encoder: {
    __one_of: ['default', 'html'],
  },
  force_source: {
    __one_of: ['false', 'true'],
  },
  fragmenter: {
    __one_of: ['simple', 'span'],
  },
  highlight_query: {
    __scope_link: 'GLOBAL.query',
  },
  matched_fields: ['FIELD'],
  order: {},
  no_match_size: 0,
  number_of_fragments: 5,
  phrase_limit: 256,
  pre_tags: {},
  post_tags: {},
  require_field_match: {
    __one_of: ['true', 'false'],
  },
  tags_schema: {},
};

export const globals = (specService: SpecDefinitionsService) => {
  specService.addGlobalAutocompleteRules('highlight', {
    ...highlightOptions,
    fields: {
      '{field}': {
        fragment_size: 20,
        ...highlightOptions,
      },
    },
  });

  specService.addGlobalAutocompleteRules('script', {
    __template: {
      source: 'SCRIPT',
    },
    source: 'SCRIPT',
    file: 'FILE_SCRIPT_NAME',
    id: 'SCRIPT_ID',
    lang: '',
    params: {},
  });
};
