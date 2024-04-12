/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Joi from 'joi';
import joiToJsonParse from 'joi-to-json';
import { postProcessMutations } from './post_process_mutations';
import { Context } from './post_process_mutations';
import { processRef } from './post_process_mutations/mutations';

interface ParseArgs {
  schema: Joi.Schema;
  ctx?: Context;
}

export const parse = ({ schema, ctx = { sharedSchemas: new Map() } }: ParseArgs) => {
  const result = joiToJsonParse(schema, 'open-api');
  postProcessMutations({ schema: result, ctx });
  const ref = processRef(ctx, result);
  return { shared: ctx.sharedSchemas, result: ref ?? result };
};
