/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Syntax grammars for `codeBlock` and `diff`. Registration is process-global:
// call `registerDefaultSyntaxGrammars()` once at plugin start, and
// `clearSyntaxGrammars()` in test teardown. Reaches `refractor` and
// `@elastic/prismjs-esql`, both of which Kibana already carries through EUI.

export {
  clearSyntaxGrammars,
  collapseTokens,
  defaultSyntaxGrammars,
  isHighlightedLanguage,
  kql,
  registerDefaultSyntaxGrammars,
  registerSyntaxGrammars,
  tokenizeCode,
} from './vendor/adaptive-ui-host-kibana/syntax';

export type {
  CodeToken,
  SyntaxTokenizer,
  TokenKind,
} from './vendor/adaptive-ui-host-kibana/syntax';
