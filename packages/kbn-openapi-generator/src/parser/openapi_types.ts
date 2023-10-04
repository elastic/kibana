/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';

interface AdditionalProperties {
  /**
   * Whether or not the route and its schemas should be generated
   */
  'x-codegen-enabled'?: boolean;
}

export type OpenApiDocument = OpenAPIV3.Document<AdditionalProperties>;

// Override the OpenAPI types to add the x-codegen-enabled property to the
// components object.
declare module 'openapi-types' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace OpenAPIV3 {
    interface ComponentsObject {
      'x-codegen-enabled'?: boolean;
    }
  }
}

export type NormalizedReferenceObject = OpenAPIV3.ReferenceObject & {
  referenceName: string;
};

export interface UnknownType {
  type: 'unknown';
}

export type NormalizedSchemaObject =
  | OpenAPIV3.ArraySchemaObject
  | OpenAPIV3.NonArraySchemaObject
  | UnknownType;

export type NormalizedSchemaItem = OpenAPIV3.SchemaObject | NormalizedReferenceObject;

/**
 * OpenAPI types do not have a dedicated type for objects, so we need to create
 * to use for path and query parameters
 */
export interface ObjectSchema {
  type: 'object';
  required: string[];
  description?: string;
  properties: {
    [name: string]: NormalizedSchemaItem;
  };
}

/**
 * The normalized operation object that is used in the templates
 */
export interface NormalizedOperation {
  path: string;
  method: OpenAPIV3.HttpMethods;
  operationId: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  requestParams?: NormalizedSchemaItem;
  requestQuery?: NormalizedSchemaItem;
  requestBody?: NormalizedSchemaItem;
  response?: NormalizedSchemaItem;
}
