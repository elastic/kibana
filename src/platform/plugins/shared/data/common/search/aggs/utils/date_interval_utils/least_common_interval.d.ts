/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Finds the lowest common interval between two given ES date histogram intervals
 * in the format of (value)(unit)
 *
 *  - `ms` units are fixed-length intervals
 *  - `s, m, h, d` units are fixed-length intervals when value > 1 (i.e. 2m, 24h, 7d),
 *    but calendar interval when value === 1
 *  - `w, M, q, y` units are calendar intervals and do not support multiple, aka
 *    value must === 1
 *
 * @returns {string}
 */
export declare function leastCommonInterval(a: string, b: string): string;
