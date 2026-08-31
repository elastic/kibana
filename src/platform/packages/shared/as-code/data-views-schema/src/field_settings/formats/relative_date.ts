/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const relativeDateFormatSchema = z
  .object({
    type: z.literal('relative_date'),
  })
  .meta({
    id: 'kbn-field-format-relative_date',
    title: 'Relative date field format',
    description: 'Formats a field into a relative date value. For example: "1 day ago".',
  });
