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
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from '../schemas/v1';

// config
export type CasesWebhookPublicConfigurationType = z.infer<
  typeof ExternalIncidentServiceConfigurationSchema
>;
// secrets
export type CasesWebhookSecretConfigurationType = z.infer<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;
// params
export type CasesWebhookActionParamsType = z.infer<typeof ExecutorParamsSchema>;

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = z.infer<typeof ExecutorSubActionPushParamsSchema>;
export type PushToServiceApiParams = ExecutorSubActionPushParams;

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}
export type CasesWebhookExecutorResultData = ExternalServiceIncidentResponse;
