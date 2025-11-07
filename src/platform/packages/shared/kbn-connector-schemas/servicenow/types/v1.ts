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
  ExternalIncidentServiceConfigurationBaseSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorSubActionGetChoicesParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionCloseIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionCommonFieldsParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
} from '../schemas/v1';
import type { ActionParamsType as ServiceNowITSMActionParams } from '../../servicenow_itsm';
import type { ActionParamsType as ServiceNowSIRActionParams } from '../../servicenow_sir';

export type ServiceNowPublicConfigurationBaseType = z.infer<
  typeof ExternalIncidentServiceConfigurationBaseSchema
>;

export type ServiceNowSecretConfigurationType = z.infer<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ExecutorSubActionGetChoicesParams = z.infer<
  typeof ExecutorSubActionGetChoicesParamsSchema
>;

export type ExecutorSubActionGetIncidentParams = z.infer<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionCloseIncidentParams = z.infer<
  typeof ExecutorSubActionCloseIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = z.infer<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type ExecutorSubActionCommonFieldsParams = z.infer<
  typeof ExecutorSubActionCommonFieldsParamsSchema
>;

export type ServiceNowPublicConfigurationType = z.infer<
  typeof ExternalIncidentServiceConfigurationSchema
>;

export type ServiceNowActionParams = ServiceNowITSMActionParams | ServiceNowSIRActionParams;
