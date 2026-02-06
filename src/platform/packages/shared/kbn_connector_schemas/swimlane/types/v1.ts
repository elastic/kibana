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
  ConfigMappingSchema,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  SwimlaneSecretsConfigurationSchema,
  SwimlaneServiceConfigurationSchema,
} from '../schemas/v1';

export type SwimlanePublicConfigurationType = z.infer<typeof SwimlaneServiceConfigurationSchema>;
export type SwimlaneSecretConfigurationType = z.infer<typeof SwimlaneSecretsConfigurationSchema>;

export type MappingConfigType = z.infer<typeof ConfigMappingSchema>;
export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = z.infer<typeof ExecutorSubActionPushParamsSchema>;

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export interface CreateRecordParams {
  incident: Incident;
}
export interface UpdateRecordParams extends CreateRecordParams {
  incidentId: string;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;
