/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Joi from 'joi';
import joiToJsonParse from 'joi-to-json';
import type { OpenAPIV3 } from 'openapi-types';
import { createCtx, postProcessMutations } from './post_process_mutations';
import type { IContext } from './post_process_mutations';

interface ParseArgs {
  schema: Joi.Schema;
  ctx?: IContext;
}

export const joi2JsonInternal = (schema: Joi.Schema) => {
  return joiToJsonParse(schema, 'open-api');
};

export const parse = ({ schema, ctx = createCtx() }: ParseArgs) => {
  const parsed: OpenAPIV3.SchemaObject = joi2JsonInternal(schema);
  postProcessMutations({ schema: parsed, ctx });
  const result = ctx.processRef(parsed);
  return { shared: ctx.sharedSchemas, result };
};
