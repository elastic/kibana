/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type {
  WorkdayActionParamsSchema,
  WorkdayConfigSchema,
  WorkdayGetTokenResponseSchema,
  WorkdayGetWorkerParamsSchema,
  WorkdayGetWorkerResponseSchema,
  WorkdaySearchWorkersParamsSchema,
  WorkdaySearchWorkersResponseSchema,
  WorkdaySecretsSchema,
} from '../schemas/v1';

export type WorkdayConfig = z.infer<typeof WorkdayConfigSchema>;
export type WorkdaySecrets = z.infer<typeof WorkdaySecretsSchema>;

export type WorkdayGetTokenResponse = z.infer<typeof WorkdayGetTokenResponseSchema>;

export type WorkdayGetWorkerParams = z.infer<typeof WorkdayGetWorkerParamsSchema>;
export type WorkdayGetWorkerResponse = z.infer<typeof WorkdayGetWorkerResponseSchema>;

export type WorkdaySearchWorkersParams = z.infer<typeof WorkdaySearchWorkersParamsSchema>;
export type WorkdaySearchWorkersResponse = z.infer<typeof WorkdaySearchWorkersResponseSchema>;

export type WorkdayActionParams = z.infer<typeof WorkdayActionParamsSchema>;
