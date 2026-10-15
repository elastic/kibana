/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const currencyFormatSchema = z
  .object({
    type: z.literal('currency'),
  })
  .meta({
    id: 'kbn-field-format-currency',
    title: 'Currency field format',
    description:
      'Formats a field into a currency value. The format is determined by the pattern of the format:currency:defaultPattern advanced setting.',
  });
