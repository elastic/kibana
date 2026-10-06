/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcedureSchemas } from '../../common';
export interface ProcedureDefinition<
  Context extends object | void = void,
  I extends object | void = void,
  O = any
> {
  fn: (context: Context, input: I extends void ? undefined : I) => Promise<O>;
  schemas?: ProcedureSchemas;
}
export declare class RpcService<
  Context extends object | void = void,
  Names extends string = string
> {
  private registry;
  register(name: Names, definition: ProcedureDefinition<Context>): void;
  call(
    context: Context,
    name: Names,
    input?: unknown
  ): Promise<{
    result: unknown;
  }>;
}
