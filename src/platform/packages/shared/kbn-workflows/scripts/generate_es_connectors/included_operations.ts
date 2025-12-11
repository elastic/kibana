/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// export const INCLUDED_OPERATIONS = [
//   // 'index', // Index document with ID (PUT /{index}/_doc/{id})
//   'index-1', // Index document without ID (POST /{index}/_doc)
//   // 'create-1', // Create document (POST /{index}/_create/{id})
//   // 'create', // Create document (PUT /{index}/_create/{id})
//   // 'delete', // Delete document by ID (DELETE /{index}/_doc/{id})
//   // 'exists', // Check if document exists (HEAD /{index}/_doc/{id})
//   // 'get', // Get document by ID (GET /{index}/_doc/{id})
//   'update', // Update document by ID (POST /{index}/_update/{id})
//   'search', // Search all indices with body (POST /_search)
//   'search-2', // Search specific index with body (POST /{index}/_search)
//   'count', // Count documents in all indices with query (POST /_count)
//   'count-3', // Count documents in specific index with query (POST /{index}/_count)
// ];

export const INCLUDED_OPERATIONS = [
  'PUT /{index}/_doc/{id}', // Index document with ID.                    | index
  'POST /{index}/_doc', // Index document without ID                      | index-1
  'POST /{index}/_create/{id}', // Create document (POST)                 | create-1
  'PUT /{index}/_create/{id}', // Create document (PUT)                   | create
  'DELETE /{index}/_doc/{id}', // Delete document by ID                   | delete
  'HEAD /{index}/_doc/{id}', // Check if document exists                  | exists
  'GET /{index}/_doc/{id}', // Get document by ID                         | get
  'POST /{index}/_update/{id}', // Update document by ID                  | update
  'POST /_search', // Search all indices with body.                       | search
  'POST /{index}/_search', // Search specific index with body             | search-2
  'POST /_count', // Count documents in all indices with query            | count
  'POST /{index}/_count', // Count documents in specific index with query | count-3
];

export const INCLUDED_OPERATIONS_V2 = {
  '/{index}/_doc/{id}': new Set(['PUT', 'GET', 'DELETE', 'HEAD']),
  '/{index}/_doc': new Set(['POST']),
  '/{index}/_create/{id}': new Set(['POST', 'PUT']),
  '/{index}/_update/{id}': new Set(['POST']),
  '/_search': new Set(['POST']),
  '/{index}/_search': new Set(['POST']),
  '/_count': new Set(['POST']),
  '/{index}/_count': new Set(['POST']),
} as Record<string, Set<string>>;

export const INCLUDED_OPERATIONS_MAP = INCLUDED_OPERATIONS.reduce((acc, current) => {
  const currentParts = current.split(' ');
  const method = currentParts[0];
  const path = currentParts[1];
  acc.set(path, method);
  return acc;
}, new Map<string, string>());
