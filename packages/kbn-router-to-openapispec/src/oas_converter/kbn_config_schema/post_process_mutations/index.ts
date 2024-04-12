/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import * as mutations from './mutations';

export interface Context {
  sharedSchemas: Map<string, OpenAPIV3.SchemaObject>;
}

interface PostProcessMutationsArgs {
  schema: OpenAPIV3.SchemaObject;
  ctx: Context;
}

export const postProcessMutations = ({ ctx, schema }: PostProcessMutationsArgs) => {
  walkSchema(ctx, schema);
  return ctx;
};

const arrayContainers: Array<keyof OpenAPIV3.SchemaObject> = ['allOf', 'oneOf', 'anyOf'];

const walkSchema = (ctx: Context, schema: OpenAPIV3.SchemaObject): void => {
  mutations.processAny(schema);
  if (schema.type === 'array') {
    walkSchema(ctx, schema.items as OpenAPIV3.SchemaObject);
  } else if (schema.type === 'object') {
    if (schema.properties) {
      Object.values(schema.properties).forEach((value) => {
        walkSchema(ctx, value as OpenAPIV3.SchemaObject);
      });
    }
    mutations.processObject(ctx, schema);
  } else if ((schema.type as string) === 'record') {
    mutations.processRecord(ctx, schema);
  } else if ((schema.type as string) === 'map') {
    mutations.processMap(ctx, schema);
  } else if (schema.type === 'string') {
    mutations.processString(schema);
  } else if (schema.type) {
    // Do nothing
  } else {
    for (const arrayContainer of arrayContainers) {
      if (schema[arrayContainer]) {
        schema[arrayContainer].forEach((s: OpenAPIV3.SchemaObject, idx: number) => {
          walkSchema(ctx, s);
          schema[arrayContainer][idx] = mutations.processRef(ctx, s) ?? schema[arrayContainer][idx];
        });
        break;
      }
    }
  }
};
