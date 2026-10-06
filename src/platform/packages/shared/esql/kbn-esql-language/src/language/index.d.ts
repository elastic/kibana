/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getSignatureHelp } from './signature_help';
export { getHoverItem } from './hover';
export { inlineSuggest } from './inline_suggestions/inline_suggest';
export { suggest } from './autocomplete/autocomplete';
export { getDocumentHighlightItems } from './document_highlight';
export { validateQuery } from './validation/validation';
export type { ValidationOptions } from './validation/types';
export { getQuickFixesForMessage } from './code_actions';
export type { EsqlCodeAction } from './code_actions';
