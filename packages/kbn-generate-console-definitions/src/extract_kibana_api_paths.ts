/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EndpointDescription } from '@kbn/console-plugin/common/types';
import type { OasDocument, OasOperation, OasParameter } from './oas_schema_converters';
import { getDynamicPathComponents } from './kibana_dynamic_path_params';
import {
  convertBodyRules,
  convertPathParameters,
  convertQueryParameters,
  resolveParameter,
} from './oas_schema_converters';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

// Same base as `kibanaApiReference` in @kbn/doc-links.
const KIBANA_API_DOCS_URL = 'https://www.elastic.co/docs/api/doc/kibana/';

const isOperation = (value: OasOperation | OasParameter[] | undefined): value is OasOperation =>
  typeof value === 'object' && !Array.isArray(value);

// Parameters declared on the operation override the shared ones of the same name and location.
const getParameters = (
  oasDocument: OasDocument,
  pathParameters: OasParameter[] = [],
  operationParameters: OasParameter[] = []
): OasParameter[] => {
  const byKey = new Map<string, OasParameter>();
  [...pathParameters, ...operationParameters].forEach((parameter) => {
    const resolved = resolveParameter(oasDocument, parameter);
    if (resolved?.name && resolved.in) {
      byKey.set(`${resolved.in}:${resolved.name}`, resolved);
    }
  });
  return [...byKey.values()];
};

/**
 * Builds Console endpoint definitions (methods, URL patterns, documentation links, query and
 * path parameters, the cluster specific path params and the top levels of the JSON request body) from a parsed Kibana OpenAPI document, one definition per operation keyed by its
 * operationId. Patterns have no leading or trailing slash, matching the Elasticsearch ones.
 */
export const extractKibanaApiPaths = (
  oasDocument: OasDocument
): Record<string, EndpointDescription> => {
  const result: Record<string, EndpointDescription> = {};

  for (const [pathTemplate, pathItem] of Object.entries(oasDocument.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!isOperation(operation)) {
        continue;
      }
      const { operationId } = operation;
      if (typeof operationId !== 'string' || !operationId) {
        continue;
      }

      const parameters = getParameters(oasDocument, pathItem.parameters, operation.parameters);
      const urlParams = convertQueryParameters(
        oasDocument,
        parameters.filter(({ in: location }) => location === 'query')
      );
      const pattern = pathTemplate.replace(/^\/|\/$/g, '');
      const urlComponents = {
        ...convertPathParameters(
          oasDocument,
          parameters.filter(({ in: location }) => location === 'path')
        ),
        ...getDynamicPathComponents(pattern),
      };
      const bodyRules = convertBodyRules(
        oasDocument,
        operation.requestBody?.content?.['application/json']?.schema
      );

      result[operationId] = {
        methods: [method.toUpperCase()],
        patterns: [pattern],
        documentation: `${KIBANA_API_DOCS_URL}operation/operation-${operationId}`,
        ...(Object.keys(urlParams).length > 0 && { url_params: urlParams }),
        ...(Object.keys(urlComponents).length > 0 && { url_components: urlComponents }),
        ...(bodyRules && { data_autocomplete_rules: bodyRules }),
      };
    }
  }

  return result;
};
