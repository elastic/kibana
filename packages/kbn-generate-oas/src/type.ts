/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';

export interface OpenAPIConverter {
  extractParameterObjects(
    schema: unknown,
    pathParameters: string[],
    inType: 'path' | 'query'
  ): OpenAPIV3.ParameterObject[] | undefined;

  convert(schema: unknown): OpenAPIV3.BaseSchemaObject;

  is(type: unknown): boolean;
}
