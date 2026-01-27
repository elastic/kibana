/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
import type { SUB_ACTION } from '../constants';
import type {
  CreateAlertParamsSchema,
  ConfigSchema,
  SecretsSchema,
  FailureResponse,
  CloseAlertParamsSchema,
} from '../schemas/v1';

export type Config = z.infer<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;

export type CreateAlertParams = z.infer<typeof CreateAlertParamsSchema>;
export type CloseAlertParams = z.infer<typeof CloseAlertParamsSchema>;

export interface CreateAlertSubActionParams {
  subAction: SUB_ACTION.CreateAlert;
  subActionParams: CreateAlertParams;
}

export interface CloseAlertSubActionParams {
  subAction: SUB_ACTION.CloseAlert;
  subActionParams: CloseAlertParams;
}

export type Params = CreateAlertSubActionParams | CloseAlertSubActionParams;

export type FailureResponseType = z.infer<typeof FailureResponse>;
