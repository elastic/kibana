"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.globals = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const highlightOptions = {
  boundary_chars: {},
  boundary_max_scan: 20,
  boundary_scanner: {
    __one_of: ['chars', 'sentence', 'word']
  },
  boundary_scanner_locale: {},
  encoder: {
    __one_of: ['default', 'html']
  },
  force_source: {
    __one_of: ['false', 'true']
  },
  fragmenter: {
    __one_of: ['simple', 'span']
  },
  highlight_query: {
    __scope_link: 'GLOBAL.query'
  },
  matched_fields: ['FIELD'],
  order: {},
  no_match_size: 0,
  number_of_fragments: 5,
  phrase_limit: 256,
  pre_tags: {},
  post_tags: {},
  require_field_match: {
    __one_of: ['true', 'false']
  },
  tags_schema: {}
};

const globals = specService => {
  specService.addGlobalAutocompleteRules('highlight', { ...highlightOptions,
    fields: {
      '{field}': {
        fragment_size: 20,
        ...highlightOptions
      }
    }
  });
  specService.addGlobalAutocompleteRules('script', {
    __template: {
      source: 'SCRIPT'
    },
    source: 'SCRIPT',
    file: 'FILE_SCRIPT_NAME',
    id: 'SCRIPT_ID',
    lang: '',
    params: {}
  });
};

exports.globals = globals;