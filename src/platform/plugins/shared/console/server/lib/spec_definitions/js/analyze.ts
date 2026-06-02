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

const CHAR_FILTER_TYPES = ['html_strip', 'mapping', 'pattern_replace'] as const;

const TOKEN_FILTER_TYPES = [
  'apostrophe',
  'asciifolding',
  'cjk_bigram',
  'cjk_width',
  'classic',
  'common_grams',
  'conditional',
  'decimal_digit',
  'delimited_payload',
  'dictionary_decompounder',
  'edge_ngram',
  'elision',
  'fingerprint',
  'flatten_graph',
  'hunspell',
  'hyphenation_decompounder',
  'keep',
  'keep_types',
  'keyword_marker',
  'keyword_repeat',
  'kstem',
  'length',
  'limit',
  'lowercase',
  'min_hash',
  'multiplexer',
  'ngram',
  'pattern_capture',
  'pattern_replace',
  'phonetic',
  'porter_stem',
  'predicate_token_filter',
  'remove_duplicates',
  'reverse',
  'shingle',
  'snowball',
  'stemmer',
  'stemmer_override',
  'stop',
  'synonym',
  'synonym_graph',
  'trim',
  'truncate',
  'unique',
  'uppercase',
  'word_delimiter',
  'word_delimiter_graph',
] as const;

const TOKENIZER_TYPES = [
  'standard',
  'letter',
  'lowercase',
  'whitespace',
  'uax_url_email',
  'classic',
  'thai',
  'ngram',
  'edge_ngram',
  'keyword',
  'pattern',
  'simple_pattern',
  'char_group',
  'simple_pattern_split',
  'path_hierarchy',
] as const;

const ANALYZER_TYPES = [
  'standard',
  'simple',
  'whitespace',
  'stop',
  'keyword',
  'pattern',
  'fingerprint',
  'arabic',
  'armenian',
  'basque',
  'bengali',
  'brazilian',
  'bulgarian',
  'catalan',
  'cjk',
  'czech',
  'danish',
  'dutch',
  'english',
  'estonian',
  'finnish',
  'french',
  'galician',
  'german',
  'greek',
  'hindi',
  'hungarian',
  'indonesian',
  'irish',
  'italian',
  'latvian',
  'lithuanian',
  'norwegian',
  'persian',
  'portuguese',
  'romanian',
  'russian',
  'sorani',
  'spanish',
  'swedish',
  'thai',
  'turkish',
] as const;

export const CHAR_FILTER_FIELD = {
  __any_of: [...CHAR_FILTER_TYPES, { type: { __one_of: [...CHAR_FILTER_TYPES] } }],
};

export const TOKEN_FILTER_FIELD = {
  __any_of: [...TOKEN_FILTER_TYPES, { type: { __one_of: [...TOKEN_FILTER_TYPES] } }],
};

export const TOKENIZER_FIELD = {
  __one_of: [...TOKENIZER_TYPES, { type: { __one_of: [...TOKENIZER_TYPES] } }],
};

export const analyze = (specService: SpecDefinitionsService) => {
  specService.addEndpointDescription('analyze', {
    data_autocomplete_rules: {
      attributes: [],
      analyzer: { __one_of: ANALYZER_TYPES },
      char_filter: CHAR_FILTER_FIELD,
      explain: BOOLEAN,
      field: '',
      filter: TOKEN_FILTER_FIELD,
      normalizer: '',
      text: '',
      tokenizer: TOKENIZER_FIELD,
    },
  });
};
