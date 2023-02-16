/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ProcedureSchemas } from '../../common';
import { validate } from '../utils';

export interface ProcedureDefinition<
  Context extends object | void = void,
  I extends object = any,
  O = any
> {
  fn: (context: Context, input?: I) => Promise<O>;
  schemas?: ProcedureSchemas;
}

export class RpcService<Context extends object | void = void, Names extends string = string> {
  private registry: Map<string, ProcedureDefinition<Context>> = new Map();

  register<I extends object = any, O = any>(
    name: Names,
    definition: ProcedureDefinition<Context, I, O>
  ) {
    this.registry.set(name, definition);
  }

  async call<I extends object = any, O = any>(
    context: Context,
    name: Names,
    input?: I
  ): Promise<{ result: O }> {
    const procedure: ProcedureDefinition<Context, I, O> | undefined = this.registry.get(name);

    if (!procedure) throw new Error(`Procedure [${name}] is not registered.`);

    const { fn, schemas } = procedure;

    // 1. Validate input
    if (schemas?.in) {
      const error = validate(input, schemas.in);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    } else if (input !== undefined) {
      // TODO: Improve error handling
      throw new Error(`Input schema missing for [${name}] procedure.`);
    }

    // 2. Execute procedure
    const result = await fn(context, input);

    // 3. Validate output
    if (schemas?.out) {
      const error = validate(result, schemas.out);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    }

    return { result };
  }
}
