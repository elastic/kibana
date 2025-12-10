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
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
  StreamActionParamsSchema,
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
} from '../schemas/v1';

export type Config = z.input<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;
export type RunActionParams = z.infer<typeof RunActionParamsSchema>;
export type InvokeAIActionParams = z.infer<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = z.infer<typeof InvokeAIActionResponseSchema>;
export type RunActionResponse = z.infer<typeof RunActionResponseSchema>;
export type DashboardActionParams = z.infer<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = z.infer<typeof DashboardActionResponseSchema>;
export type StreamActionParams = z.infer<typeof StreamActionParamsSchema>;
