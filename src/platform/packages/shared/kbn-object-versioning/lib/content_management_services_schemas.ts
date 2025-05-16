/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isConfigSchema, schema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';

// Validate that the value is a function
const functionSchema = schema.any({
  validate: (value) => {
    if (typeof value !== 'function') {
      return 'Must be a function';
    }
  },
});

// Validate that the value is a kbn config Schema (Type<any>)
const kbnConfigSchema = schema.any({
  validate: (value) => {
    if (!isConfigSchema(value)) {
      return 'Invalid schema type.';
    }
  },
});

// VersionableObject schema
const versionableObjectSchema = schema.object(
  {
    schema: schema.maybe(kbnConfigSchema),
    down: schema.maybe(functionSchema),
    up: schema.maybe(functionSchema),
  },
  { unknowns: 'forbid' }
);

const getOptionalInOutSchemas = (props: { in: Type<any>; out: Type<any> }) =>
  schema.maybe(schema.object(props, { unknowns: 'forbid' }));

// Schema to validate the "get" service objects
// Note: the "bulkGet" and "delete" services also use this schema as they allow the same IN/OUT objects
const getSchemas = getOptionalInOutSchemas({
  in: schema.maybe(
    schema.object(
      {
        options: schema.maybe(versionableObjectSchema),
      },
      { unknowns: 'forbid' }
    )
  ),
  out: schema.maybe(
    schema.object(
      {
        result: schema.maybe(versionableObjectSchema),
      },
      { unknowns: 'forbid' }
    )
  ),
});

// Schema to validate the "create" service objects
// Note: the "update" service also uses this schema as they allow the same IN/OUT objects
const createSchemas = getOptionalInOutSchemas({
  in: schema.maybe(
    schema.object(
      {
        data: schema.maybe(versionableObjectSchema),
        options: schema.maybe(versionableObjectSchema),
      },
      { unknowns: 'forbid' }
    )
  ),
  out: schema.maybe(
    schema.object(
      {
        result: schema.maybe(versionableObjectSchema),
      },
      { unknowns: 'forbid' }
    )
  ),
});

// Schema to validate the "search" service objects
const searchSchemas = getOptionalInOutSchemas({
  in: schema.maybe(
    schema.object(
      {
        options: schema.maybe(versionableObjectSchema),
      },
      { unknowns: 'forbid' }
    )
  ),
  out: schema.maybe(
    schema.object(
      {
        result: schema.maybe(versionableObjectSchema),
      },
      { unknowns: 'forbid' }
    )
  ),
});

// Schema to validate the "msearch" service objects
const mSearchSchemas = schema.maybe(
  schema.object({
    out: schema.maybe(
      schema.object(
        {
          result: schema.maybe(versionableObjectSchema),
        },
        { unknowns: 'forbid' }
      )
    ),
  })
);

export const serviceDefinitionSchema = schema.object(
  {
    get: getSchemas,
    bulkGet: getSchemas,
    create: createSchemas,
    update: createSchemas,
    delete: getSchemas,
    search: searchSchemas,
    mSearch: mSearchSchemas,
  },
  { unknowns: 'forbid' }
);
