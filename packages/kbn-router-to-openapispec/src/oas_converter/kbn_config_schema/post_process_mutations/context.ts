/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { processRef as processRefMutation } from './mutations/ref';
import { removeSharedComponentId } from '../lib';

export interface IContext {
  sharedSchemas: Map<string, OpenAPIV3.SchemaObject>;
  /**
   * Attempt to convert a schema object to ref, my perform side-effect
   *
   * Will return the schema sans the ref meta ID if refs are disabled
   *
   * @note see also {@link Options['refs']}
   */
  processRef: (
    schema: OpenAPIV3.SchemaObject
  ) => OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
}

interface Options {
  sharedSchemas?: Map<string, OpenAPIV3.SchemaObject>;
  refs?: boolean;
}

class Context implements IContext {
  readonly sharedSchemas: Map<string, OpenAPIV3.SchemaObject>;
  readonly refs: boolean;
  constructor(opts: Options) {
    this.sharedSchemas = opts.sharedSchemas ?? new Map();
    this.refs = !!opts.refs;
  }
  public processRef(
    schema: OpenAPIV3.SchemaObject
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if (this.refs) {
      return processRefMutation(this, schema) ?? schema;
    }
    return removeSharedComponentId(schema);
  }
}

export const createCtx = (opts: Options = { sharedSchemas: new Map() }) => {
  return new Context(opts);
};
