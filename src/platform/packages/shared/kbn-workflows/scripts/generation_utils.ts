/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { InternalConnectorContract } from '../types/latest';

export interface ContractMeta
  extends Omit<InternalConnectorContract, 'paramsSchema' | 'outputSchema'> {
  contractName: string;
  operationIds: string[];
  schemaImports: string[];
}

export function generateContractBlock(contract: ContractMeta): string {
  return `
  const ${contract.contractName}: InternalConnectorContract = {
    type: '${contract.type}',
    summary: \`${escapeString(contract.summary ?? '')}\`,
    description: \`${escapeString(contract.description ?? '')}\`,
    methods: ${JSON.stringify(contract?.methods ?? [])},
    patterns: ${JSON.stringify(contract?.patterns ?? [])},
    isInternal: false,
    documentation: '${contract.documentation}',
    parameterTypes: {
      pathParams: ${JSON.stringify(contract?.parameterTypes?.pathParams ?? [])},
      urlParams: ${JSON.stringify(contract?.parameterTypes?.urlParams ?? [])},
      bodyParams: ${JSON.stringify(contract?.parameterTypes?.bodyParams ?? [])},
    },
    paramsSchema: ${generateParamsSchemaString(contract.operationIds)},
    outputSchema: ${generateOutputSchemaString(contract.operationIds)},
  }`.trim();
}

// TODO: unwrap and combine the shapes at the build time instead of at the runtime
// Union is important because if we use object we override parameters from "body", "path", "query" with the same name with the latest one
export function generateParamsSchemaString(operationIds: string[]): string {
  return generateParamsSchemaStringUnion(operationIds);
}

function generateParamsSchemaStringUnion(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  return `z.union([${operationIds
    .map(
      (operationId) =>
        `getLooseObjectFromProperty(${getRequestSchemaName(operationId)}, 'body'),
          getLooseObjectFromProperty(${getRequestSchemaName(operationId)}, 'path'),
          getLooseObjectFromProperty(${getRequestSchemaName(operationId)}, 'query'),`
    )
    .join('\n')}])`;
}

function generateParamsSchemaStringObject(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  if (operationIds.length === 1) {
    return `z.looseObject({
      ...(getShape(getShape(${getRequestSchemaName(operationIds[0])}).body)), 
      ...(getShape(getShape(${getRequestSchemaName(operationIds[0])}).path)), 
      ...(getShape(getShape(${getRequestSchemaName(operationIds[0])}).query)),
    }).partial()`;
  }
  return `z.looseObject({${operationIds
    .map(
      (operationId) => `...(getShape(getShape(${getRequestSchemaName(operationId)}).body)), 
    ...(getShape(getShape(${getRequestSchemaName(operationId)}).path)), 
    ...(getShape(getShape(${getRequestSchemaName(operationId)}).query)),`
    )
    .join('\n')}}).partial()`;
}

export function generateOutputSchemaString(operationIds: string[]): string {
  // TODO: add error schema
  return generateSuccessSchemaString(operationIds);
}

function generateSuccessSchemaString(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  if (operationIds.length === 1) {
    return `${getResponseSchemaName(operationIds[0])}`;
  }
  return `z.union([${operationIds
    .map((operationId) => `${getResponseSchemaName(operationId)}`)
    .join(', ')}])`;
}

export function getRequestSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_request`;
}

export function getResponseSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_response`;
}

// copied from packages/openapi-ts/src/openApi/common/parser/sanitize.ts, which is licensed under the MIT license
/**
 * Sanitizes namespace identifiers so they are valid TypeScript identifiers of a certain form.
 *
 * 1: Remove any leading characters that are illegal as starting character of a typescript identifier.
 * 2: Replace illegal characters in remaining part of type name with hyphen (-).
 *
 * Step 1 should perhaps instead also replace illegal characters with underscore, or prefix with it, like sanitizeEnumName
 * does. The way this is now one could perhaps end up removing all characters, if all are illegal start characters. It
 * would be sort of a breaking change to do so, though, previously generated code might change then.
 *
 * JavaScript identifier regexp pattern retrieved from https://developer.mozilla.org/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 *
 * The output of this is expected to be converted to PascalCase
 */
export const sanitizeNamespaceIdentifier = (name: string) =>
  name
    .replace(/^[^\p{ID_Start}]+/u, '')
    .replace(/[^$\u200c\u200d\p{ID_Continue}]/gu, '-')
    .replace(/[$+]/g, '-');

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, ''); // remove leading underscore
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/-(\d+)/g, '$1') // Remove hyphen before numbers
    .replace(/-/g, '_') // Replace remaining hyphens with underscores
    .replace(/\./g, '_'); // Replace dots with underscores
}

export function getSchemaNamePrefix(operationId: string): string {
  return toSnakeCase(camelToSnake(sanitizeNamespaceIdentifier(operationId)));
}

export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$'); // Escape dollar signs (template literals)
}

export function generateParameterTypes(
  operations: OpenAPIV3.OperationObject[],
  openApiDocument: OpenAPIV3.Document
): {
  pathParams: string[];
  urlParams: string[];
  bodyParams: string[];
} {
  const allParameters = operations
    .flatMap((operation) => operation.parameters)
    .filter(
      (param): param is OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject => param !== undefined
    )
    .map((param) => ('$ref' in param ? resolveReferenceObject(param, openApiDocument) : param))
    .filter((param): param is OpenAPIV3.ParameterObject => param !== null && 'name' in param);

  const pathParams = new Set(
    allParameters.filter((param) => param.in === 'path').map((param) => param.name)
  );
  const urlParams = new Set(
    allParameters.filter((param) => param.in === 'query').map((param) => param.name)
  );
  const requestBodiesSchemas = operations
    .map((operation) => operation.requestBody)
    .filter(
      (requestBody): requestBody is OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject =>
        requestBody !== undefined
    )
    .map((requestBody) =>
      '$ref' in requestBody ? resolveReferenceObject(requestBody, openApiDocument) : requestBody
    )
    .filter(
      (requestBody): requestBody is OpenAPIV3.RequestBodyObject =>
        requestBody !== null &&
        'content' in requestBody &&
        requestBody.content !== undefined &&
        'application/json' in requestBody.content &&
        requestBody.content['application/json']?.schema !== undefined
    )
    .map((requestBody) => requestBody.content['application/json'].schema);
  const bodyParams = new Set(
    requestBodiesSchemas
      .map((schema) => ('ref' in schema ? resolveReferenceObject(schema, openApiDocument) : schema))
      .filter(
        (schema): schema is OpenAPIV3.SchemaObject =>
          schema !== null &&
          schema !== undefined &&
          'properties' in schema &&
          schema.properties !== undefined
      )
      .map((schema) => Object.keys(schema.properties))
      .flat()
  );
  return {
    pathParams: Array.from(pathParams),
    urlParams: Array.from(urlParams),
    bodyParams: Array.from(bodyParams),
  };
}

/**
 * Resolve a reference object to a parameter object
 * @param param - The reference object to resolve, e.g. { "$ref": "#/components/parameters/search-index" }
 * @param openApiDocument - The OpenAPI document
 * @returns The parameter object
 */
function resolveReferenceObject(
  param: OpenAPIV3.ReferenceObject,
  openApiDocument: OpenAPIV3.Document
):
  | OpenAPIV3.ParameterObject
  | OpenAPIV3.SchemaObject
  | OpenAPIV3.ResponseObject
  | OpenAPIV3.RequestBodyObject
  | null {
  const path = param.$ref.replace(/^#\//, '').split('/');
  let current: unknown = openApiDocument;
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment];
    } else {
      return null;
    }
  }

  return current;
}
