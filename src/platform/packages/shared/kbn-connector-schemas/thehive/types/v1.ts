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
  TheHiveConfigSchema,
  TheHiveSecretsSchema,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionCreateAlertParamsSchema,
  TheHiveFailureResponseSchema,
  TheHiveIncidentResponseSchema,
} from '../schemas/v1';

export type TheHiveConfig = z.input<typeof TheHiveConfigSchema>;
export type TheHiveSecrets = z.infer<typeof TheHiveSecretsSchema>;

export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = z.infer<typeof ExecutorSubActionPushParamsSchema>;
export type ExecutorSubActionCreateAlertParams = z.infer<
  typeof ExecutorSubActionCreateAlertParamsSchema
>;

export type TheHiveFailureResponse = z.infer<typeof TheHiveFailureResponseSchema>;

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export type GetIncidentResponse = z.input<typeof TheHiveIncidentResponseSchema>;
