/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

import { SELECTIONS_MAX } from '@kbn/controls-constants';

const searchTechniqueSchema = schema.maybe(
  schema.oneOf([schema.literal('exact'), schema.literal('prefix'), schema.literal('wildcard')])
);

const selectedOptionsSchema = schema.maybe(
  schema.oneOf([
    schema.arrayOf(schema.string(), { maxSize: SELECTIONS_MAX }), // maxSize for DoS prevention
    schema.arrayOf(schema.number(), { maxSize: SELECTIONS_MAX }),
  ])
);

const optionsListFetchBodyCommonSchema = schema.object(
  {
    searchString: schema.maybe(schema.string()),
    searchTechnique: searchTechniqueSchema,
    selectedOptions: selectedOptionsSchema,
    ignoreValidations: schema.maybe(schema.boolean()),
    isReload: schema.maybe(schema.boolean()),
    sort: schema.maybe(schema.any()),
    projectRouting: schema.maybe(schema.string({ maxLength: 10000 })),
  },
  { unknowns: 'allow' }
);

/**
 * Body accepted by an options list DSL suggestions route. Exported so plugins that serve
 * suggestions for their own index can validate the exact same payload the controls send.
 */
export const optionsListDslFetchBodySchema = optionsListFetchBodyCommonSchema.extends({
  kind: schema.literal('dsl'),
  index: schema.string(),
  size: schema.number(),
  fieldName: schema.string(),
  filters: schema.maybe(schema.any()),
  fieldSpec: schema.maybe(schema.any()),
  runtimeFieldMap: schema.maybe(schema.any()),
  runPastTimeout: schema.maybe(schema.boolean()),
});

export const optionsListEsqlFetchBodySchema = optionsListFetchBodyCommonSchema.extends({
  kind: schema.literal('esql'),
  esql: schema.string(),
  timeRange: schema.maybe(schema.any()),
  filter: schema.maybe(schema.any()),
  esqlVariables: schema.maybe(schema.arrayOf(schema.any(), { maxSize: 1000 })),
});
