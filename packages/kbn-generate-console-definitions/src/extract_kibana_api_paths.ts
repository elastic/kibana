/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EndpointDescription } from '@kbn/console-plugin/common/types';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

// Same base as `kibanaApiReference` in @kbn/doc-links.
const KIBANA_API_DOCS_URL = 'https://www.elastic.co/docs/api/doc/kibana/';

interface OasOperation {
  operationId?: unknown;
}

interface OasDocument {
  paths?: Record<string, Record<string, OasOperation>>;
}

/**
 * Builds Console endpoint definitions (methods, URL patterns and documentation links)
 * from a parsed Kibana OpenAPI document, one definition per operation keyed by its
 * operationId. Patterns have no leading or trailing slash, matching the Elasticsearch ones.
 */
export const extractKibanaApiPaths = (
  oasDocument: OasDocument
): Record<string, EndpointDescription> => {
  const result: Record<string, EndpointDescription> = {};

  for (const [pathTemplate, operations] of Object.entries(oasDocument.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operationId = operations[method]?.operationId;
      if (typeof operationId !== 'string' || !operationId) {
        continue;
      }
      result[operationId] = {
        methods: [method.toUpperCase()],
        patterns: [pathTemplate.replace(/^\/|\/$/g, '')],
        documentation: `${KIBANA_API_DOCS_URL}operation/operation-${operationId}`,
      };
    }
  }

  return result;
};
