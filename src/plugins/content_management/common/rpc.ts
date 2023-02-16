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

export const procedureNames = ['get', 'create', 'update', 'delete', 'search'] as const;

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

export interface GetIn<T extends string = string, Options extends object | undefined = undefined> {
  id: string;
  contentType: T;
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
  Data extends object = object,
  Options extends object = object
> {
  contentType: T;
  data: Data;
  options?: Options;
}

// -- Update content
const updateSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentType: schema.string(),
      data: schema.object({}, { unknowns: 'allow' }),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};

export interface UpdateIn<
  T extends string = string,
  Data extends object = object,
  Options extends object | undefined = undefined
> {
  contentType: T;
  data: Data;
  options?: Options;
}

// -- Delete content
const deleteSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentType: schema.string(),
      data: schema.object({}, { unknowns: 'allow' }),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};

export interface DeleteIn<
  T extends string = string,
  Data extends object = object,
  Options extends object = any
> {
  contentType: T;
  data: Data;
  options?: Options;
}

// -- Search content
const searchSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentType: schema.string(),
      data: schema.object({}, { unknowns: 'allow' }),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.object({ hits: schema.arrayOf(schema.object({}, { unknowns: 'allow' })) }),
};

export interface SearchIn<
  T extends string = string,
  Params extends object = object,
  Options extends object | undefined = undefined
> {
  contentType: T;
  params: Params;
  options?: Options;
}

export interface SearchOut<Data extends object = object> {
  hits: Data[];
}

export const schemas: {
  [key in ProcedureName]: ProcedureSchemas;
} = {
  get: getSchemas,
  create: createSchemas,
  update: updateSchemas,
  delete: deleteSchemas,
  search: searchSchemas,
};
