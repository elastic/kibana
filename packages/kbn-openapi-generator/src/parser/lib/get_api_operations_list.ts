/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import type {
  NormalizedOperation,
  NormalizedSchemaItem,
  ObjectSchema,
  OpenApiDocument,
} from '../openapi_types';

const HTTP_METHODS = Object.values(OpenAPIV3.HttpMethods);

export function getApiOperationsList(parsedSchema: OpenApiDocument): NormalizedOperation[] {
  const operations: NormalizedOperation[] = Object.entries(parsedSchema.paths).flatMap(
    ([path, pathDefinition]) => {
      return HTTP_METHODS.flatMap((method) => {
        const operation = pathDefinition?.[method];
        if (operation?.['x-codegen-enabled'] !== true) {
          // Skip the operation if it's not enabled for codegen
          return [];
        }

        // Convert the query parameters to a schema object. In OpenAPI spec the
        // query and path params are different from the request body, we want to
        // convert them to a single schema format to simplify their usage in the
        // templates
        const params: Record<'query' | 'path', ObjectSchema> = {
          query: {
            type: 'object',
            properties: {},
            required: [],
          },
          path: {
            type: 'object',
            properties: {},
            required: [],
          },
        };

        operation.parameters?.forEach((parameter) => {
          if ('name' in parameter && (parameter.in === 'query' || parameter.in === 'path')) {
            params[parameter.in].properties[parameter.name] = {
              ...parameter.schema,
              description: parameter.description,
            };

            if (parameter.required) {
              params[parameter.in].required.push(parameter.name);
            }
          }
        });

        const requestParams = Object.keys(params.path.properties).length ? params.path : undefined;
        const requestQuery = Object.keys(params.query.properties).length ? params.query : undefined;

        // We don't use $ref in responses or request bodies currently, so we
        // throw an error if we encounter one to narrow down the types. The
        // support might be added in the future if needed.
        if ('$ref' in operation.responses?.['200']) {
          throw new Error(
            `Cannot generate response for ${method} ${path}: $ref in response is not supported`
          );
        }

        if (operation.requestBody && '$ref' in operation.requestBody) {
          throw new Error(
            `Cannot generate request for ${method} ${path}: $ref in request body is not supported`
          );
        }

        const { operationId, description, tags, deprecated } = operation;

        // Operation ID is used as a prefix for the generated function names,
        // runtime schemas, etc. So it must be unique and not empty
        if (!operationId) {
          throw new Error(`Missing operationId for ${method} ${path}`);
        }

        const response = operation.responses?.['200']?.content?.['application/json']?.schema as
          | NormalizedSchemaItem
          | undefined;
        const requestBody = operation.requestBody?.content?.['application/json']?.schema as
          | NormalizedSchemaItem
          | undefined;
        const normalizedOperation: NormalizedOperation = {
          path,
          method,
          operationId,
          description,
          tags,
          deprecated,
          requestParams,
          requestQuery,
          requestBody,
          response,
        };

        return normalizedOperation;
      });
    }
  );

  // Check that all operation IDs are unique
  const operationIdOccurrences = operations.reduce((acc, operation) => {
    acc[operation.operationId] = (acc[operation.operationId] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const duplicateOperationIds = Object.entries(operationIdOccurrences).filter(
    ([, count]) => count > 1
  );
  if (duplicateOperationIds.length) {
    throw new Error(
      `Operation IDs must be unique, found duplicates: ${duplicateOperationIds
        .map(([operationId, count]) => `${operationId} (${count})`)
        .join(', ')}`
    );
  }

  // Sort the operations by operationId to make the generated code more stable
  operations.sort((a, b) => a.operationId.localeCompare(b.operationId));

  return operations;
}
