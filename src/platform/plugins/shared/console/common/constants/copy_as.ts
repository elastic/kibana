/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Default language for the language selector
export const DEFAULT_LANGUAGE = 'curl';
// These values are the ones that should match the available languages from the
// `@elastic/request-converter` package but since it cannot run on client side,
// we hardcode the available languages in order to avoid having to make an extra
// request to fetch them.
export const AVAILABLE_LANGUAGES = [
  { value: 'curl', label: 'curl' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
];
