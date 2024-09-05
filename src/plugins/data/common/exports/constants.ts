/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const CSV_FORMULA_CHARS = ['=', '+', '-', '@'];
export const nonAlphaNumRE = /[^a-zA-Z0-9]/;
export const allDoubleQuoteRE = /"/g;
// this is a non-exhaustive list of delimiters that require to be quoted
export const commonQuotedDelimiters = new Set([',', ';', '\t', ' ', '|']);
