/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const truncateFormatSchema = z
  .object({
    type: z.literal('truncate'),
    params: z
      .object({
        field_length: z.number().optional(),
      })
      .optional(),
  })
  .meta({
    id: 'kbn-field-format-truncate',
    title: 'Truncate field format',
    description:
      'Truncates the field value to the specified length. If the field value is longer than the specified length, it will be truncated and the remaining text will be replaced with "...".',
  });
