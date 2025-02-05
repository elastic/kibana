/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Joi from 'joi';
import joiToJsonParse from 'joi-to-json';
import { omit } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import { createCtx, postProcessMutations } from './post_process_mutations';
import type { IContext } from './post_process_mutations';

interface ParseArgs {
  schema: Joi.Schema;
  ctx?: IContext;
}

export interface JoiToJsonReferenceObject extends OpenAPIV3.BaseSchemaObject {
  schemas: { [id: string]: OpenAPIV3.SchemaObject };
}

type ParseResult = OpenAPIV3.SchemaObject | JoiToJsonReferenceObject;

export const isJoiToJsonSpecialSchemas = (
  parseResult: ParseResult
): parseResult is JoiToJsonReferenceObject => {
  return 'schemas' in parseResult;
};

export const joi2JsonInternal = (schema: Joi.Schema) => {
  return joiToJsonParse(schema, 'open-api');
};

export const parse = ({ schema, ctx = createCtx() }: ParseArgs) => {
  const parsed: ParseResult = joi2JsonInternal(schema);
  let result: OpenAPIV3.SchemaObject;
  if (isJoiToJsonSpecialSchemas(parsed)) {
    Object.entries(parsed.schemas).forEach(([id, s]) => {
      postProcessMutations({ schema: s, ctx });
      ctx.addSharedSchema(id, s);
    });
    result = omit(parsed, 'schemas');
  } else {
    result = parsed;
  }
  postProcessMutations({ schema: result, ctx });
  return { shared: ctx.getSharedSchemas(), result };
};
