/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type Joi from 'joi';
import type { OpenAPIV3 } from 'openapi-types';
import type { IContext } from './post_process_mutations';
interface ParseArgs {
  schema: Joi.Schema;
  ctx?: IContext;
}
export interface JoiToJsonReferenceObject extends OpenAPIV3.BaseSchemaObject {
  schemas: {
    [id: string]: OpenAPIV3.SchemaObject;
  };
}
type ParseResult = OpenAPIV3.SchemaObject | JoiToJsonReferenceObject;
export declare const isJoiToJsonSpecialSchemas: (
  parseResult: ParseResult
) => parseResult is JoiToJsonReferenceObject;
export declare const joi2JsonInternal: (schema: Joi.Schema) => any;
export declare const parse: ({ schema, ctx }: ParseArgs) => {
  shared: {
    [id: string]: OpenAPIV3.SchemaObject;
  };
  result: OpenAPIV3.SchemaObject;
};
export {};
