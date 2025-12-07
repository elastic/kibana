/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { getOrResolveObject } from '../../common/utils';

export function generateParameterTypes(
  operations: OpenAPIV3.OperationObject[],
  openApiDocument: OpenAPIV3.Document
): {
  headerParams: string[];
  pathParams: string[];
  urlParams: string[];
  bodyParams: string[];
} {
  const allParameters = operations
    .flatMap((operation) => operation.parameters)
    .filter(
      (param): param is OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject => param !== undefined
    )
    .map((param) => getOrResolveObject<OpenAPIV3.ParameterObject>(param, openApiDocument))
    .filter((param): param is OpenAPIV3.ParameterObject => param !== null && 'name' in param);

  const headerParams = new Set(
    allParameters.filter((param) => param.in === 'header').map((param) => param.name)
  );
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
      getOrResolveObject<OpenAPIV3.RequestBodyObject>(requestBody, openApiDocument)
    )
    .filter((requestBody): requestBody is OpenAPIV3.RequestBodyObject => requestBody !== null)
    .map((requestBody) =>
      getOrResolveObject<OpenAPIV3.SchemaObject>(
        requestBody.content['application/json']?.schema,
        openApiDocument
      )
    )
    .filter((schema): schema is OpenAPIV3.SchemaObject => schema !== null);
  const bodyParams = new Set(
    requestBodiesSchemas
      .map((schema) => getOrResolveObject(schema, openApiDocument))
      .filter(
        (schema): schema is OpenAPIV3.NonArraySchemaObject =>
          schema !== null &&
          typeof schema === 'object' &&
          'properties' in schema &&
          schema.properties !== undefined
      )
      .map((schema) => Object.keys(schema.properties ?? {}))
      .flat()
  );
  return {
    headerParams: Array.from(headerParams),
    pathParams: Array.from(pathParams),
    urlParams: Array.from(urlParams),
    bodyParams: Array.from(bodyParams),
  };
}
