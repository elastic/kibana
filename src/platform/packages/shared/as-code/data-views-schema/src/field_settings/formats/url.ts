/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const baseSubtypeOptionsSchema = z.object({
  url_template: z.string().optional(),
  label_template: z.string().optional(),
});

export const urlFormatSchema = z.object({
  type: z.literal('url'),
  params: z.discriminatedUnion('type', [
    baseSubtypeOptionsSchema.extend({
      type: z.literal('link'),
      open_in_new_tab: z.boolean().optional(),
    }),
    baseSubtypeOptionsSchema.extend({
      type: z.literal('img'),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    baseSubtypeOptionsSchema.extend({ type: z.literal('audio') }),
  ]),
});
