/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type UrlGeneratorId = string;

export interface UrlGeneratorState<
  S extends {},
  I extends string | undefined = undefined,
  MS extends {} | undefined = undefined
> {
  State: S;
  MigratedId?: I;
  MigratedState?: MS;
}

export interface UrlGeneratorStateMapping {
  // The `any` here is quite unfortunate.  Using `object` actually gives no type errors in my IDE
  // but running `node scripts/type_check` will cause an error:
  // examples/url_generators_examples/public/url_generator.ts:77:66 -
  // error TS2339: Property 'name' does not exist on type 'object'.  However it's correctly
  // typed when I edit that file.
  [key: string]: UrlGeneratorState<any, string | undefined, object | undefined>;
}

export interface UrlGeneratorsDefinition<Id extends UrlGeneratorId> {
  id: Id;
  createUrl?: (state: UrlGeneratorStateMapping[Id]['State']) => Promise<string>;
  isDeprecated?: boolean;
  migrate?: (
    state: UrlGeneratorStateMapping[Id]['State']
  ) => Promise<{
    state: UrlGeneratorStateMapping[Id]['MigratedState'];
    id: UrlGeneratorStateMapping[Id]['MigratedId'];
  }>;
}
