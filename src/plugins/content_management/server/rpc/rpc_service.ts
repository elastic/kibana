/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcedureSchemas } from '../../common';
import { validate } from '../utils';

export interface ProcedureDefinition<
  Context extends object | void = void,
  I extends object | void = void,
  O = any
> {
  fn: (context: Context, input: I extends void ? undefined : I) => Promise<O>;
  schemas?: ProcedureSchemas;
}

export class RpcService<Context extends object | void = void, Names extends string = string> {
  private registry: Map<string, ProcedureDefinition<Context>> = new Map();

  register(name: Names, definition: ProcedureDefinition<Context>) {
    this.registry.set(name, definition);
  }

  async call(context: Context, name: Names, input?: unknown): Promise<{ result: unknown }> {
    const procedure: ProcedureDefinition<Context, any> | undefined = this.registry.get(name);

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
