/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const consoleSnippetSchemaV1 = schema.object({
  title: schema.string(),
  titleKeyword: schema.string(),
  description: schema.string({ defaultValue: '' }),
  query: schema.string(),
  endpoint: schema.string({ defaultValue: '' }),
  method: schema.string({ defaultValue: 'GET' }),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  createdBy: schema.string({ defaultValue: '' }),
  updatedBy: schema.string({ defaultValue: '' }),
});
