/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaApiDocLinksMap } from '@kbn/console-plugin/common/types/api_responses';

// operationIds are identical between the stateful and serverless Kibana OpenAPI
// bundles for shared paths, so a single map (extracted from either bundle) is
// enough; only the documentation site base URL differs at runtime.
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

interface OasOperation {
  operationId?: unknown;
}

interface OasDocument {
  paths?: Record<string, Record<string, OasOperation>>;
}

/**
 * Extracts a compact `{ pathTemplate: { method: operationId } }` map from a
 * parsed Kibana OpenAPI document, for use by Console's "Open API reference"
 * link resolver.
 */
export const extractKibanaApiDocLinks = (oasDocument: OasDocument): KibanaApiDocLinksMap => {
  const result: KibanaApiDocLinksMap = {};

  for (const [pathTemplate, operations] of Object.entries(oasDocument.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operationId = operations[method]?.operationId;
      if (typeof operationId !== 'string' || !operationId) {
        continue;
      }
      result[pathTemplate] = result[pathTemplate] ?? {};
      result[pathTemplate][method] = operationId;
    }
  }

  return result;
};
