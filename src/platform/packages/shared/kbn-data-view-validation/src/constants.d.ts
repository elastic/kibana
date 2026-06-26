/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Error code for when an index pattern contains illegal characters
 */
export declare const ILLEGAL_CHARACTERS_KEY: 'ILLEGAL_CHARACTERS';
/**
 * Error code for when an index pattern contains spaces
 */
export declare const CONTAINS_SPACES_KEY: 'CONTAINS_SPACES';
/**
 * Characters disallowed in index patterns that are visible.
 */
export declare const ILLEGAL_CHARACTERS_VISIBLE: string[];
/**
 * All characters disallowed in index patterns.
 */
export declare const ILLEGAL_CHARACTERS: string[];
