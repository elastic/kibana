/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema, TypeOf } from '@kbn/config-schema';

/**
 * Interface to represent a reference field (allows to populate() content)
 */
export const refSchema = schema.object(
  {
    $id: schema.string(),
  },
  { unknowns: 'forbid' }
);

export type Ref = TypeOf<typeof refSchema>;

/**
 * Fields that _all_ content must have (fields editable by the user)
 */
export const commonFieldsProps = {
  title: schema.string(),
  description: schema.maybe(schema.string()),
};

const commonFieldsSchema = schema.object({ ...commonFieldsProps }, { unknowns: 'forbid' });

export type CommonFields = TypeOf<typeof commonFieldsSchema>;

/**
 * Fields that all content must have (fields *not* editable by the user)
 */
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

export const internalFieldsSchema = schema.object(
  { ...internalFieldsProps },
  { unknowns: 'forbid' }
);

export type InternalFields = TypeOf<typeof internalFieldsSchema>;

/**
 * Base type for all content (in the search index)
 */
export const contentSchema = schema.object(
  {
    ...internalFieldsProps,
    ...commonFieldsProps,
  },
  { unknowns: 'forbid' }
);

export type Content = TypeOf<typeof contentSchema>;
