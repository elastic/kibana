/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const EDITOR_MARKER = 'marker_esql_editor';

export const TICKS_REGEX = /^`{1}|`{1}$/g;
export const DOUBLE_TICKS_REGEX = /``/g;
export const SINGLE_TICK_REGEX = /`/g;
export const DOUBLE_BACKTICK = '``';
export const SINGLE_BACKTICK = '`';

export const METADATA_FIELDS = ['_version', '_id', '_index', '_source', '_ignored', '_index_mode'];

export const FULL_TEXT_SEARCH_FUNCTIONS = ['match', 'match_operator', 'qstr', 'kql'];
export const UNSUPPORTED_COMMANDS_BEFORE_QSTR = new Set([
  'show',
  'row',
  'dissect',
  'enrich',
  'eval',
  'grok',
  'keep',
  'mv_expand',
  'rename',
  'stats',
  'limit',
]);
export const UNSUPPORTED_COMMANDS_BEFORE_MATCH = new Set(['limit']);
