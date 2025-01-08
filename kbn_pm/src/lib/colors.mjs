/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Print an error title, prints on a red background with white text
 * @param {string} txt
 */
export const err = (txt) => `\x1b[41m\x1b[37m${txt}\x1b[39m\x1b[49m`;

/**
 * Print some text with some spacing, with very high contrast and bold text
 * @param {string} txt
 */
export const title = (txt) => `\x1b[100m\x1b[37m\x1b[1m ${txt} \x1b[22m\x1b[39m\x1b[49m`;

/**
 * Print the yellow warning label
 * @param {string} txt
 */
export const warning = (txt) => `\x1b[33m${txt}\x1b[39m`;

/**
 * Print the simple blue info label
 * @param {string} txt
 */
export const info = (txt) => `\x1b[94m${txt}\x1b[39m`;

/**
 * Print a green success label
 * @param {string} txt
 */
export const success = (txt) => `\x1b[32m${txt}\x1b[39m`;

/**
 * Print the simple dim debug label
 * @param {string} txt
 */
export const debug = (txt) => `\x1b[2m${txt}\x1b[22m`;

/**
 * Print the bright verbose label
 * @param {string} txt
 */
export const verbose = (txt) => `\x1b[35m${txt}\x1b[39m`;
