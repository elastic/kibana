/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { discoverSessionApiEmbeddableOverridesSchema } from './embeddable_overrides';
import { discoverSessionApiEmbeddableTabSchema } from './embeddable_tab';

export const discoverSessionApiEmbeddableByValueConfigSchema = z
  .object({
    tabs: z.array(discoverSessionApiEmbeddableTabSchema).min(1).max(1).meta({
      description:
        'Inline tab configuration. Used when no `ref_id` is set. Currently supports one tab.',
    }),
  })
  .strict();

export const discoverSessionApiEmbeddableByReferenceConfigSchema = z
  .object({
    ref_id: z.string(),
    selected_tab_id: z.string().optional().meta({
      description:
        'Tab to select from the referenced saved object. If omitted, defaults to the first tab.',
    }),
    overrides: discoverSessionApiEmbeddableOverridesSchema,
  })
  .strict();
