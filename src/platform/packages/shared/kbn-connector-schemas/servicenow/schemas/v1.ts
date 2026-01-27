/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
import { Coerced, validateKeysAllowed, validateRecordMaxKeys } from '../../common/utils';
import { DEFAULT_ALERTS_GROUPING_KEY, MAX_ADDITIONAL_FIELDS_LENGTH } from '../constants';

export const ExternalIncidentServiceConfigurationBase = {
  apiUrl: z.string(),
  isOAuth: z.boolean().default(false),
  userIdentifierValue: z.string().nullable().default(null), // required if isOAuth = true
  clientId: z.string().nullable().default(null), // required if isOAuth = true
  jwtKeyId: z.string().nullable().default(null), // required if isOAuth = true
};

export const ExternalIncidentServiceConfiguration = {
  ...ExternalIncidentServiceConfigurationBase,
  usesTableApi: z.boolean().default(true),
};

export const ExternalIncidentServiceConfigurationBaseSchema = z
  .object(ExternalIncidentServiceConfigurationBase)
  .strict();

export const ExternalIncidentServiceConfigurationSchema = z
  .object(ExternalIncidentServiceConfiguration)
  .strict();

export const ExternalIncidentServiceSecretConfiguration = {
  password: z.string().nullable().default(null), // required if isOAuth = false
  username: z.string().nullable().default(null), // required if isOAuth = false
  clientSecret: z.string().nullable().default(null), // required if isOAuth = true
  privateKey: z.string().nullable().default(null), // required if isOAuth = true
  privateKeyPassword: z.string().nullable().default(null),
};

export const ExternalIncidentServiceSecretConfigurationSchema = z
  .object(ExternalIncidentServiceSecretConfiguration)
  .strict();

export const CommentsSchema = z
  .array(
    z
      .object({
        comment: z.string(),
        commentId: z.string(),
      })
      .strict()
  )
  .nullable()
  .default(null);

export const validateOtherFieldsKeys = (key: string, ctx: z.RefinementCtx) => {
  validateKeysAllowed({
    key,
    ctx,
    disallowList: commonIncidentSchemaObjectProperties,
    fieldName: 'additional_fields',
  });
};

export const CommonAttributes = {
  short_description: z.string(),
  description: z.string().nullable().default(null),
  externalId: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  subcategory: z.string().nullable().default(null),
  correlation_id: z.string().nullable().default(DEFAULT_ALERTS_GROUPING_KEY),
  correlation_display: z.string().nullable().default(null),
  additional_fields: Coerced(
    z
      .record(
        z.string().superRefine((value, ctx) => {
          validateOtherFieldsKeys(value, ctx);
        }),
        z.any()
      )
      .superRefine((val, ctx) =>
        validateRecordMaxKeys({
          record: val,
          ctx,
          maxNumberOfFields: MAX_ADDITIONAL_FIELDS_LENGTH,
          fieldName: 'additional_fields',
        })
      )
      .nullable()
      .default(null)
  ),
};

export const commonIncidentSchemaObjectProperties = Object.keys(CommonAttributes);

export const ExecutorSubActionGetChoicesParamsSchema = z
  .object({
    fields: z.array(z.string()),
  })
  .strict();

export const ExecutorSubActionGetIncidentParamsSchema = z
  .object({
    externalId: z.string(),
  })
  .strict();

export const ExecutorSubActionCloseIncidentParamsSchema = z
  .object({
    incident: z
      .object({
        externalId: z.string().nullable().default(null),
        correlation_id: z.string().default(DEFAULT_ALERTS_GROUPING_KEY).nullable(),
      })
      .strict(),
  })
  .strict();

// Reserved for future implementation
export const ExecutorSubActionHandshakeParamsSchema = z.object({}).strict();
export const ExecutorSubActionCommonFieldsParamsSchema = z.object({}).strict();
