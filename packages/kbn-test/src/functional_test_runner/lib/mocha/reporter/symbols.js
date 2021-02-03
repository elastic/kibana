/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// originally extracted from mocha https://git.io/v1PGh

export const ok = process.platform === 'win32' ? '\u221A' : '✓';

export const err = process.platform === 'win32' ? '\u00D7' : '✖';
