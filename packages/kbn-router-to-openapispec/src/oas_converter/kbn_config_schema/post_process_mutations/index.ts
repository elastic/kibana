/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import * as mutations from './mutations';
import type { IContext } from './context';
import { isAnyType } from './mutations/utils';

interface PostProcessMutationsArgs {
  schema: OpenAPIV3.SchemaObject;
  ctx: IContext;
}

export const postProcessMutations = ({ ctx, schema }: PostProcessMutationsArgs) => {
  walkSchema(ctx, schema);
  return ctx;
};

const arrayContainers: Array<keyof OpenAPIV3.SchemaObject> = ['allOf', 'oneOf', 'anyOf'];

const walkSchema = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  if (isAnyType(schema)) {
    mutations.processAnyType(schema);
    return;
  }

  mutations.processAllTypes(schema);
  /* At runtime 'type' can be broader than 'NonArraySchemaObjectType', so we set it to 'string' */
  const type: undefined | string = schema.type;
  if (type === 'array') {
    const items = (schema as OpenAPIV3.ArraySchemaObject).items;
    walkSchema(ctx, items as OpenAPIV3.SchemaObject);
  } else if (type === 'object') {
    if (schema.properties) {
      Object.values(schema.properties).forEach((value) => {
        walkSchema(ctx, value as OpenAPIV3.SchemaObject);
      });
    }
    mutations.processObject(ctx, schema);
  } else if (type === 'string') {
    mutations.processString(schema);
  } else if (type === 'record') {
    mutations.processRecord(ctx, schema);
  } else if (type === 'map') {
    mutations.processMap(ctx, schema);
  } else if (type === 'stream') {
    mutations.processStream(schema);
  } else if (schema.type) {
    // Do nothing
  } else {
    for (const arrayContainer of arrayContainers) {
      if (schema[arrayContainer]) {
        schema[arrayContainer].forEach((s: OpenAPIV3.SchemaObject, idx: number) => {
          walkSchema(ctx, s);
          schema[arrayContainer][idx] = ctx.processRef(s);
        });
        break;
      }
    }
  }
};

export { createCtx } from './context';
export type { IContext } from './context';
