/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';

export interface IContext {
  addSharedSchema: (id: string, schema: OpenAPIV3.SchemaObject) => void;
  getSharedSchemas: () => { [id: string]: OpenAPIV3.SchemaObject };
}

interface Options {
  sharedSchemas?: Map<string, OpenAPIV3.SchemaObject>;
}

class Context implements IContext {
  private readonly sharedSchemas: Map<string, OpenAPIV3.SchemaObject>;
  constructor(opts: Options) {
    this.sharedSchemas = opts.sharedSchemas ?? new Map();
  }
  public addSharedSchema(id: string, schema: OpenAPIV3.SchemaObject): void {
    this.sharedSchemas.set(id, schema);
  }

  public getSharedSchemas() {
    return Object.fromEntries(this.sharedSchemas.entries());
  }
}

export const createCtx = (opts: Options = { sharedSchemas: new Map() }) => {
  return new Context(opts);
};
