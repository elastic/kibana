/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Extracts and returns a list of unique lookup indices from the provided ESQL query by parsing the query and traversing its AST.
 *
 * @param {string} esqlQuery - The ESQL query string to parse and analyze for lookup indices.
 * @return {string[]} An array of unique lookup index names found in the query.
 */
export declare function getLookupIndicesFromQuery(esqlQuery: string): string[];
