/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { ValidationOptions } from './validation/types';

/**
 * High level functions
 */

// Validation function
export { validateQuery } from './validation/validation';
// Autocomplete function
export { suggest } from './autocomplete/autocomplete';

// Inline suggestions
export { inlineSuggest } from './inline_suggestions/inline_suggest';

/**
 * Some utility functions that can be useful to build more feature
 * for the ES|QL language
 */
export { getPolicyHelper, getSourcesHelper } from './shared/resources_helpers';
// Hover function
export { getHoverItem } from './hover';
