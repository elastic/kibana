/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema, Type } from '@kbn/config-schema';

export interface ProcedureSchemas {
  in?: Type<any> | false;
  out?: Type<any> | false;
}

export const procedureNames = ['get', 'create'] as const;

export type ProcedureName = typeof procedureNames[number];

// ---------------------------------
// API
// ---------------------------------

// ------- GET --------
const getSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentType: schema.string(),
      id: schema.string(),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  // --> "out" will be specified by each storage layer
  out: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};

export interface GetIn<Options extends object | undefined = undefined> {
  id: string;
  contentType: string;
  options?: Options;
}

// -- Create content
const createSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentType: schema.string(),
      data: schema.object({}, { unknowns: 'allow' }),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  // Here we could enforce that an "id" field is returned
  out: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};

export interface CreateIn<
  T extends string = string,
  Data extends object = Record<string, unknown>,
  Options extends object = any
> {
  contentType: T;
  data: Data;
  options?: Options;
}

export const schemas: {
  [key in ProcedureName]: ProcedureSchemas;
} = {
  get: getSchemas,
  create: createSchemas,
};
