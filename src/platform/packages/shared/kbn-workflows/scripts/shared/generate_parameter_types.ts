/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { ParameterTypes } from './types';
import { getOrResolveObject } from '../../common/utils';

export function generateParameterTypes(
  operations: OpenAPIV3.OperationObject[],
  openApiDocument: OpenAPIV3.Document
): ParameterTypes {
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

  // Extract request body schemas and process them with the new recursive function
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
    .map((requestBody) => requestBody.content?.['application/json']?.schema)
    .filter(
      (schema): schema is OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject => schema !== undefined
    );

  // Use the new recursive function to extract all properties
  const bodyParams = new Set(
    requestBodiesSchemas
      .map((schema) => extractPropertiesFromSchema(schema, openApiDocument))
      .flat()
  );

  return {
    headerParams: Array.from(headerParams),
    pathParams: Array.from(pathParams),
    urlParams: Array.from(urlParams),
    bodyParams: Array.from(bodyParams),
  };
}

export function generateParameterTypesForOperation(
  operation: OpenAPIV3.OperationObject,
  openApiDocument: OpenAPIV3.Document
): ParameterTypes {
  const parameterTypes = generateParameterTypes([operation], openApiDocument);
  return parameterTypes;
}

/**
 * Recursively extracts all property names from a schema, handling composition schemas
 * like oneOf, allOf, anyOf as well as regular object schemas
 */
function extractPropertiesFromSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  openApiDocument: OpenAPIV3.Document,
  visited: WeakSet<object> = new WeakSet()
): string[] {
  // Resolve references first
  const resolvedSchema = getOrResolveObject<OpenAPIV3.SchemaObject>(schema, openApiDocument);
  if (!resolvedSchema || typeof resolvedSchema !== 'object') {
    return [];
  }

  // Prevent infinite recursion for circular references using object identity
  if (visited.has(resolvedSchema)) {
    return [];
  }
  visited.add(resolvedSchema);

  const properties: Set<string> = new Set();

  // Handle direct properties (object schema)
  if ('properties' in resolvedSchema && resolvedSchema.properties) {
    Object.keys(resolvedSchema.properties).forEach((key) => properties.add(key));
  }

  // Handle oneOf - union of all possible schemas
  if ('oneOf' in resolvedSchema && Array.isArray(resolvedSchema.oneOf)) {
    resolvedSchema.oneOf.forEach((subSchema) => {
      extractPropertiesFromSchema(subSchema, openApiDocument, visited).forEach((prop) =>
        properties.add(prop)
      );
    });
  }

  // Handle allOf - intersection of all schemas
  if ('allOf' in resolvedSchema && Array.isArray(resolvedSchema.allOf)) {
    resolvedSchema.allOf.forEach((subSchema) => {
      extractPropertiesFromSchema(subSchema, openApiDocument, visited).forEach((prop) =>
        properties.add(prop)
      );
    });
  }

  // Handle anyOf - similar to oneOf
  if ('anyOf' in resolvedSchema && Array.isArray(resolvedSchema.anyOf)) {
    resolvedSchema.anyOf.forEach((subSchema) => {
      extractPropertiesFromSchema(subSchema, openApiDocument, visited).forEach((prop) =>
        properties.add(prop)
      );
    });
  }

  return Array.from(properties);
}
