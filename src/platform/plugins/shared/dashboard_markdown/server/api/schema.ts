/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { markdownStateSchema } from '../embeddable/schemas';

export const markdownLibraryItemSchema = schema.object({
  ...markdownStateSchema.getPropSchemas(),
  // saved object description
  description: schema.maybe(
    schema.string({
      meta: { description: 'A short description of the markdown library item.' },
    })
  ),
  // saved object title
  title: schema.string({
    meta: { description: 'The markdown library item title.' },
    minLength: 1,
  }),
});
