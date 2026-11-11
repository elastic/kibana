/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const asCodeRelatedItemSchema = z
  .object({
    type: z.string().meta({ description: 'Saved object type of the related item.' }),
    type_label: z.string().meta({ description: 'User-facing name of the saved object type.' }),
    id: z.string().meta({ description: 'Saved object id of the related item.' }),
  })
  .strict();

export type AsCodeRelatedItem = z.output<typeof asCodeRelatedItemSchema>;
