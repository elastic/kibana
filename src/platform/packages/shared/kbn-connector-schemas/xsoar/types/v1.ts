/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
import type {
  ConfigSchema,
  SecretsSchema,
  XSOARRunActionParamsSchema,
  XSOARRunActionResponseSchema,
  XSOARPlaybooksObjectSchema,
  XSOARPlaybooksActionResponseSchema,
  ExecutorParamsSchema,
} from '../schemas/v1';

export type Config = z.infer<typeof ConfigSchema>;
export type Secrets = z.input<typeof SecretsSchema>;
export type XSOARRunActionParams = z.infer<typeof XSOARRunActionParamsSchema>;
export type XSOARRunActionResponse = z.infer<typeof XSOARRunActionResponseSchema>;
export type XSOARPlaybooksActionParams = void;
export type XSOARPlaybooksObject = z.infer<typeof XSOARPlaybooksObjectSchema>;
export type XSOARPlaybooksActionResponse = z.infer<typeof XSOARPlaybooksActionResponseSchema>;
export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
