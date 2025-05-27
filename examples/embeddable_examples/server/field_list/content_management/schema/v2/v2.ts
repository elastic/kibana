/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

// in v2 even though the schema is the same as v1, we fully decouple from the saved object schema
export const fieldListAttributesSchema = schema.object({
  dataViewId: schema.maybe(schema.string()),
  selectedFieldNames: schema.maybe(schema.arrayOf(schema.string())),
});
