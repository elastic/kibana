/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// export const INCLUDED_OPERATIONS_V2 = {
//   '/{index}/_doc/{id}': new Set(['PUT', 'GET', 'DELETE', 'HEAD']),
//   '/{index}/_doc': new Set(['POST']),
//   '/{index}/_create/{id}': new Set(['POST', 'PUT']),
//   '/{index}/_update/{id}': new Set(['POST']),
//   '/_search': new Set(['POST']),
//   '/{index}/_search': new Set(['POST']),
//   '/_count': new Set(['POST']),
//   '/{index}/_count': new Set(['POST']),
// } as Record<string, Set<string>>;

export const INCLUDED_OPERATIONS = [
  'search',
  'update',
  'indices.exists',
  'indices.delete',
  'indices.create',
  'bulk',
  'esql.query',
];
