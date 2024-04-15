/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';

export interface KnownParameters {
  [paramName: string]: { optional: boolean };
}

export interface OpenAPIConverter {
  convertPathParameters(
    schema: unknown,
    knownPathParameters: KnownParameters
  ): {
    params: OpenAPIV3.ParameterObject[];
    shared: { [key: string]: OpenAPIV3.SchemaObject };
  };

  convertQuery(schema: unknown): {
    query: OpenAPIV3.ParameterObject[];
    shared: { [key: string]: OpenAPIV3.SchemaObject };
  };

  convert(schema: unknown): {
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
    shared: { [key: string]: OpenAPIV3.SchemaObject };
  };

  is(type: unknown): boolean;
}
