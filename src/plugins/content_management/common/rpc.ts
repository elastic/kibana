/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema, TypeOf } from '@kbn/config-schema';

/** Interface to represent a reference field (allows to populate() content) */
const refSchema = schema.object(
  {
    $id: schema.string(),
  },
  { unknowns: 'forbid' }
);
export type Ref = TypeOf<typeof refSchema>;

/** Fields that _all_ content must have (fields editable by the user) */
const commonFieldsProps = {
  title: schema.string(),
  description: schema.maybe(schema.string()),
};
const commonFieldsSchema = schema.object({ ...commonFieldsProps }, { unknowns: 'forbid' });
export type CommonFields = TypeOf<typeof commonFieldsSchema>;

/** Fields that all content must have (fields *not* editable by the user) */
const internalFieldsProps = {
  id: schema.string(),
  type: schema.string(),
  meta: schema.object(
    {
      updatedAt: schema.string(),
      createdAt: schema.string(),
      updatedBy: refSchema,
      createdBy: refSchema,
    },
    { unknowns: 'forbid' }
  ),
};
const internalFieldsSchema = schema.object({ ...internalFieldsProps }, { unknowns: 'forbid' });
export type InternalFields = TypeOf<typeof internalFieldsSchema>;

/** Base type for all content (in the search index) */
const contentSchema = schema.object(
  {
    ...internalFieldsProps,
    ...commonFieldsProps,
  },
  { unknowns: 'forbid' }
);
export type Content = TypeOf<typeof contentSchema>;

// ---------------------------------
// API
// ---------------------------------

// -- Get preview
const getPreviewInSchema = schema.object(
  {
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);
export type GetPreviewIn = TypeOf<typeof getPreviewInSchema>;

const getPreviewOutSchema = contentSchema;
export type GetPreviewOut = TypeOf<typeof getPreviewOutSchema>;

// -- Get details
const getDetailsInSchema = schema.object(
  {
    type: schema.string(),
    id: schema.string(),
    options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'forbid' }
);
export type GetDetailsIn<Options extends object | undefined = undefined> = TypeOf<
  typeof getDetailsInSchema
> & { options?: Options };
export type GetDetailsOut = Record<string, unknown>;

// -- Create content
const createInSchema = schema.object(
  {
    type: schema.string(),
    // The create data will be specified for each content when they register
    data: schema.object({}, { unknowns: 'allow' }),
  },
  { unknowns: 'forbid' }
);
export interface CreateIn<
  T extends object = Record<string, unknown>,
  Options extends object | undefined = undefined
> {
  type: string;
  data: T;
  options?: Options;
}
export interface CreateOut {
  id: string;
  [key: string]: unknown;
}

// -- Search (search index)
const searchInSchema = schema.maybe(
  schema.object(
    {
      type: schema.maybe(schema.string()),
      term: schema.maybe(schema.string()),
      // More will come here...
    },
    { unknowns: 'forbid' }
  )
);
export type SearchIn = TypeOf<typeof searchInSchema>;

const searchOutSchema = schema.object(
  {
    hits: schema.arrayOf(contentSchema),
    total: schema.number(),
  },
  { unknowns: 'forbid' }
);
export type SearchOut = TypeOf<typeof searchOutSchema>;

export const schemas = {
  content: {
    ref: refSchema,
    searchIndex: contentSchema,
    internalFields: internalFieldsSchema,
    commonFields: commonFieldsSchema,
  },
  api: {
    getPreview: {
      in: getPreviewInSchema,
      out: getPreviewOutSchema,
    },
    get: {
      in: getDetailsInSchema,
      // The response will be specified for each content when they register
      out: schema.object({}),
    },
    create: {
      in: createInSchema,
      // The response will be specified for each content when they register
      out: schema.object({}),
    },
    search: {
      in: searchInSchema,
      out: searchOutSchema,
    },
  },
};

export type Calls = keyof typeof schemas.api;
