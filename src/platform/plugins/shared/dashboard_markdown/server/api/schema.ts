/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

import { markdownAttributesSchemaZod } from '../markdown_saved_object/schema/v1/v1';
import { markdownByValueStateSchema } from '../embeddable/schemas';

export const markdownLibraryItemSchema = z
  .object({
    ...markdownAttributesSchemaZod.shape,
    ...markdownByValueStateSchema.shape,
  })
  .strict();
