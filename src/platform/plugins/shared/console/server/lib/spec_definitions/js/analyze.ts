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
  'arabic_normalization',
  'arabic_stem',
  'asciifolding',
  'bengali_normalization',
  'brazilian_stem',
  'cjk_bigram',
  'cjk_width',
  'classic',
  'common_grams',
  'condition',
  'czech_stem',
  'decimal_digit',
  'delimited_payload',
  'dictionary_decompounder',
  'dutch_stem',
  'edge_ngram',
  'elision',
  'fingerprint',
  'flatten_graph',
  'french_stem',
  'german_normalization',
  'german_stem',
  'hindi_normalization',
  'hunspell',
  'hyphenation_decompounder',
  'indic_normalization',
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
  'persian_normalization',
  'persian_stem',
  'porter_stem',
  'predicate_token_filter',
  'remove_duplicates',
  'reverse',
  'russian_stem',
  'scandinavian_folding',
  'scandinavian_normalization',
  'serbian_normalization',
  'shingle',
  'snowball',
  'sorani_normalization',
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
  'char_group',
  'classic',
  'edge_ngram',
  'keyword',
  'letter',
  'lowercase',
  'ngram',
  'path_hierarchy',
  'pattern',
  'simple_pattern',
  'simple_pattern_split',
  'standard',
  'thai',
  'uax_url_email',
  'whitespace',
] as const;

const ANALYZER_TYPES = [
  'arabic',
  'armenian',
  'basque',
  'bengali',
  'brazilian',
  'bulgarian',
  'catalan',
  'chinese',
  'cjk',
  'custom',
  'czech',
  'danish',
  'dutch',
  'english',
  'estonian',
  'fingerprint',
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
  'keyword',
  'latvian',
  'lithuanian',
  'nori',
  'norwegian',
  'pattern',
  'persian',
  'portuguese',
  'romanian',
  'russian',
  'serbian',
  'simple',
  'snowball',
  'sorani',
  'spanish',
  'standard',
  'stop',
  'swedish',
  'thai',
  'turkish',
  'whitespace',
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
      normalizer: { __one_of: ['lowercase'] },
      text: '',
      tokenizer: TOKENIZER_FIELD,
    },
  });
};
