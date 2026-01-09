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

export const ExternalIncidentServiceConfiguration = {
  apiUrl: z.string(),
  orgId: z.string(),
};

export const ExternalIncidentServiceConfigurationSchema = z
  .object(ExternalIncidentServiceConfiguration)
  .strict();

export const ExternalIncidentServiceSecretConfiguration = {
  apiKeyId: z.string(),
  apiKeySecret: z.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = z
  .object(ExternalIncidentServiceSecretConfiguration)
  .strict();

const MAX_ADDITIONAL_FIELDS_LENGTH = 50;

const AdditionalFields = {
  additionalFields: Coerced(
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
          fieldName: 'additionalFields',
        })
      )
      .nullable()
      .default(null)
  ),
};

const CommonIncidentAttributes = {
  name: z.string(),
  description: z.string().nullable().default(null),
  externalId: z.string().nullable().default(null),
  incidentTypes: z.array(z.coerce.number()).nullable().default(null),
  severityCode: z.coerce.number().nullable().default(null),
  ...AdditionalFields,
};

export const commonIncidentSchemaObjectProperties = Object.keys(CommonIncidentAttributes);

const validateOtherFieldsKeys = (key: string, ctx: z.RefinementCtx) => {
  validateKeysAllowed({
    key,
    ctx,
    disallowList: commonIncidentSchemaObjectProperties,
    fieldName: 'additionalFields',
  });
};

export const ExecutorSubActionPushParamsSchema = z.object({
  incident: z
    .object({
      ...CommonIncidentAttributes,
    })
    .strict(),
  comments: z
    .array(
      z
        .object({
          comment: z.string(),
          commentId: z.string(),
        })
        .strict()
    )
    .nullable()
    .default(null),
});

export const PushToServiceIncidentSchema = {
  name: z.string(),
  description: z.string().nullable().default(null),
  incidentTypes: z.array(z.coerce.number()).nullable().default(null),
  severityCode: z.coerce.number().nullable().default(null),
  ...AdditionalFields,
};

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = z.object({}).strict();
export const ExecutorSubActionGetIncidentTypesParamsSchema = z.object({}).strict();
export const ExecutorSubActionGetSeverityParamsSchema = z.object({}).strict();

const ArrayOfValuesSchema = z.array(
  z
    .object({
      value: z.coerce.number(),
      label: z.string(),
    })
    .passthrough()
);

export const GetIncidentTypesResponseSchema = z
  .object({
    values: ArrayOfValuesSchema,
  })
  .passthrough();

export const GetSeverityResponseSchema = z
  .object({
    values: ArrayOfValuesSchema,
  })
  .passthrough();

const ValuesItemSchema = z
  .object({
    value: z.union([z.coerce.number(), z.string()]),
    label: z.string(),
    enabled: z.boolean(),
    hidden: z.boolean(),
    default: z.boolean(),
  })
  .passthrough();

export const ExternalServiceFieldsSchema = z
  .object({
    input_type: z.string(),
    name: z.string(),
    read_only: z.boolean(),
    required: z.string().nullable().default(null),
    text: z.string(),
    prefix: z.string().nullable().default(null),
    values: z.array(ValuesItemSchema).nullable().default(null),
  })
  .passthrough();

export const GetCommonFieldsResponseSchema = z.array(ExternalServiceFieldsSchema);

export const ExternalServiceIncidentResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    url: z.string(),
    pushedDate: z.string(),
  })
  .strict();

export const GetIncidentResponseSchema = z
  .object({
    id: z.coerce.number(),
    inc_last_modified_date: z.coerce.number(),
  })
  .passthrough();
