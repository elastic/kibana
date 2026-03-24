/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { getIdFromRefString } from './mutations/utils';

export interface IContext {
  addSharedSchema: (id: string, schema: OpenAPIV3.SchemaObject) => void;
  derefSharedSchema: (id: string) => OpenAPIV3.SchemaObject | undefined;
  getSharedSchemas: () => { [id: string]: OpenAPIV3.SchemaObject };
}

interface Options {
  sharedSchemas?: Map<string, OpenAPIV3.SchemaObject>;
}

class Context implements IContext {
  private readonly sharedSchemas: Map<string, OpenAPIV3.SchemaObject>;
  private readonly namespace?: string;
  constructor(opts: Options) {
    this.sharedSchemas = opts.sharedSchemas ?? new Map();
  }

  public addSharedSchema(id: string, schema: OpenAPIV3.SchemaObject): void {
    this.sharedSchemas.set(id, schema);
  }

  /** Assumes id is in the form of "#/components/schemas/my-schema-my-team" */
  public derefSharedSchema(id: string) {
    return this.sharedSchemas.get(getIdFromRefString(id));
  }

  public getSharedSchemas() {
    return Object.fromEntries(this.sharedSchemas.entries());
  }

  public getNamespace() {
    return this.namespace;
  }
}

export const createCtx = (opts: Options = { sharedSchemas: new Map() }) => {
  return new Context(opts);
};
