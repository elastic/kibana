/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const InstallFormFieldTypeSchema = z.union([
  z.literal('text'),
  z.literal('textarea'),
  z.literal('connector'),
  z.literal('select'),
  z.literal('boolean'),
  z.literal('number'),
]);

export const InstallFormFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const InstallFormFieldSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().optional(),
    description: z.string().optional(),
    inputType: InstallFormFieldTypeSchema,
    required: z.boolean().optional(),
    connectorType: z.string().optional(),
    options: z.array(InstallFormFieldOptionSchema).optional(),
    default: z.unknown().optional(),
  })
  .loose();

export const InstallFormSchemaSchema = z
  .object({
    form: z.array(InstallFormFieldSchema),
  })
  .loose();
