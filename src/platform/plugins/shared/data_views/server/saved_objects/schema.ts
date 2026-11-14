/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const SCHEMA_DATA_VIEW_V1 = schema.object({
  fields: schema.maybe(schema.string()),
  title: schema.string(),
  type: schema.maybe(schema.string()),
  typeMeta: schema.maybe(schema.string()),
  timeFieldName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(schema.string()),
  fieldFormatMap: schema.maybe(schema.string()),
  fieldAttrs: schema.maybe(schema.string()),
  runtimeFieldMap: schema.maybe(schema.string()),
  allowNoIndex: schema.maybe(schema.boolean()),
  name: schema.maybe(schema.string()),
  allowHidden: schema.maybe(schema.boolean()),
});
