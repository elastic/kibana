/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

// Short query syntax is not reflected in the OpenAPI spec, so we need to allow it
// e.g.
// GET /_search
// {
//   "query": {
//     "match": {
//       "message": "this is a test"
//     }
//   }
// }
// instead of full DSL:
// GET /_search
// {
//   "query": {
//     "match": {
//       "message": {
//         "query": "this is a test"
//       }
//     }
//   }
// }
const schemaNamesToExtend = ['_types.query_dsl.MatchQuery', '_types.query_dsl.TermQuery'];

export function allowShortQuerySyntax(document: OpenAPIV3.Document) {
  if (!document.components || !document.components.schemas) {
    return document;
  }
  document.components.schemas = Object.fromEntries(
    Object.entries(document.components.schemas).map(([key, value]) => {
      if ('$ref' in value || !schemaNamesToExtend.includes(key)) {
        return [key, value];
      }
      const extendedValue = {
        anyOf: [
          {
            type: 'string',
            description: 'Short query syntax for match query',
          },
          value,
        ],
      };
      return [key, extendedValue];
    })
  );
  return document;
}
