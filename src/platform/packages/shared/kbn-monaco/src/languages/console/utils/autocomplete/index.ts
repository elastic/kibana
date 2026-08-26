/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  checkForTripleQuotesAndEsqlQuery,
  endsWithConsoleBodyContinuation,
  getLineRemainderWithoutConsoleComments,
  isInsideConsoleComment,
  isInsideConsoleString,
  isInsideTripleQuotedJsonValue,
} from './triple_quote_scanner';
export { isEscaped } from './chars';
export { findRequestLineNumber, isRequestLineWithUrl } from './request_line';
export { getFallbackRequestStartPosition } from './request_anchor';
export { unescapeInvalidChars } from './unescape_invalid_chars';
