/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Extracts the project routing value from an ES|QL query string.
 *
 * @param queryString - The ES|QL query string to parse
 * @returns The project routing value if found, undefined otherwise
 *
 * @example
 * getProjectRoutingFromEsqlQuery('SET project_routing = "_alias:*"; FROM my_index')
 * // Returns: '_alias:*'
 *
 * getProjectRoutingFromEsqlQuery('FROM my_index')
 * // Returns: undefined
 */
export declare function getProjectRoutingFromEsqlQuery(queryString: string): string | undefined;
