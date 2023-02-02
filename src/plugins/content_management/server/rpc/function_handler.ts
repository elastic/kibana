/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ProcedureSchemas } from '../../common';

export interface ProcedureConfig<Context, I extends object = any, O extends any = any> {
  fn: (context: Context, input?: I) => Promise<O>;
  schemas?: ProcedureSchemas;
}

interface Registry<Context> {
  [name: string]: ProcedureConfig<Context>;
}

export class FunctionHandler<Context, Names extends string = string> {
  private registry: Registry<Context> = {};

  register<Config extends ProcedureConfig<any> = ProcedureConfig<Context>>(
    name: Names,
    config: Config
  ) {
    this.registry[name] = config;
  }

  async call<I extends object = any, O = any>(
    {
      name,
      input,
    }: {
      name: Names;
      input?: I;
    },
    context: Context
  ): Promise<{ result: O }> {
    const handler: ProcedureConfig<Context, I, O> = this.registry[name];

    if (!handler) throw new Error(`Handler missing for ${name}`);

    const { fn, schemas } = handler;

    // 1. Validate input
    if (schemas?.in) {
      const validation = schemas.in.getSchema().validate(input);
      if (validation.error) {
        const message = `${validation.error.message}. ${JSON.stringify(validation.error)}`;
        throw new Error(message);
      }
    } else if (input !== undefined) {
      throw new Error(`Input schema missing for [${name}] procedure.`);
    }

    // 2. Execute procedure
    const result = await fn(context, input);

    // 3. Validate output
    if (handler.schemas?.out) {
      const validation = handler.schemas.out.getSchema().validate(result);
      if (validation.error) {
        throw validation.error;
      }
    } else {
      if (result !== undefined) {
        throw new Error(`Output schema missing for [${name}] procedure.`);
      }
    }

    return { result };
  }
}
