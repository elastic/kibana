/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The public entry of the simulated `@elastic/esql-grammar` package. Kibana code imports only this file.
export { GRAMMAR_LABELS } from './grammar_labels/grammar_labels.generated';
export { getCalledRules, getCallSites } from './grammar_labels/call_sites';
export { RULE_END, RULE_START } from './grammar_labels/types';
export type { CallSite, GrammarLabel } from './grammar_labels/types';
