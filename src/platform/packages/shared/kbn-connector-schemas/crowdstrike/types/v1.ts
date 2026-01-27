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
  CrowdstrikeBaseApiResponseSchema,
  CrowdstrikeConfigSchema,
  CrowdstrikeGetAgentsParamsSchema,
  CrowdstrikeGetAgentOnlineStatusResponseSchema,
  CrowdstrikeHostActionsParamsSchema,
  CrowdstrikeSecretsSchema,
  CrowdstrikeActionParamsSchema,
  CrowdstrikeGetTokenResponseSchema,
  CrowdstrikeGetAgentsResponseSchema,
  RelaxedCrowdstrikeBaseApiResponseSchema,
  CrowdstrikeInitRTRParamsSchema,
  CrowdstrikeExecuteRTRResponseSchema,
  CrowdstrikeGetScriptsResponseSchema,
} from '../schemas/v1';

export type CrowdstrikeConfig = z.infer<typeof CrowdstrikeConfigSchema>;
export type CrowdstrikeSecrets = z.infer<typeof CrowdstrikeSecretsSchema>;

export type CrowdstrikeBaseApiResponse = z.infer<typeof CrowdstrikeBaseApiResponseSchema>;
export type RelaxedCrowdstrikeBaseApiResponse = z.infer<
  typeof RelaxedCrowdstrikeBaseApiResponseSchema
>;

export type CrowdstrikeGetAgentsParams = Partial<z.infer<typeof CrowdstrikeGetAgentsParamsSchema>>;
export type CrowdstrikeGetAgentsResponse = z.infer<typeof CrowdstrikeGetAgentsResponseSchema>;
export type CrowdstrikeGetAgentOnlineStatusResponse = z.infer<
  typeof CrowdstrikeGetAgentOnlineStatusResponseSchema
>;
export type CrowdstrikeGetTokenResponse = z.infer<typeof CrowdstrikeGetTokenResponseSchema>;

export type CrowdstrikeHostActionsParams = z.infer<typeof CrowdstrikeHostActionsParamsSchema>;

export type CrowdstrikeActionParams = z.infer<typeof CrowdstrikeActionParamsSchema>;
export type CrowdstrikeInitRTRParams = z.infer<typeof CrowdstrikeInitRTRParamsSchema>;

export type CrowdStrikeExecuteRTRResponse = z.infer<typeof CrowdstrikeExecuteRTRResponseSchema>;
export type CrowdstrikeGetScriptsResponse = z.infer<typeof CrowdstrikeGetScriptsResponseSchema>;
