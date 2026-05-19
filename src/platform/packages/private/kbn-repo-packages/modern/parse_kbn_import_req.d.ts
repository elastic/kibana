/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parse an import request to a kbn import request, or undefined
 * if this doesn't represent a kbn import request
 *
 * @param {string} importReq
 * @returns {import('./types').KbnImportReq | undefined}
 */
export function parseKbnImportReq(importReq: string): import('./types').KbnImportReq | undefined;
