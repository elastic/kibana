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
import { MAX_OTHER_FIELDS_LENGTH } from '../constants';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: z.string(),
  projectKey: z.string(),
};

export const ExternalIncidentServiceConfigurationSchema = z
  .object(ExternalIncidentServiceConfiguration)
  .strict();

export const ExternalIncidentServiceSecretConfiguration = {
  email: z.string(),
  apiToken: z.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = z
  .object(ExternalIncidentServiceSecretConfiguration)
  .strict();

const validateOtherFieldsKeys = (key: string, ctx: z.RefinementCtx) => {
  validateKeysAllowed({
    key,
    ctx,
    disallowList: incidentSchemaObjectProperties,
    fieldName: 'otherFields',
  });
};

const incidentSchemaObject = {
  summary: z.string(),
  description: z.string().nullable().default(null),
  externalId: z.string().nullable().default(null),
  issueType: z.string().nullable().default(null),
  priority: z.string().nullable().default(null),
  labels: z
    .array(
      z.string().refine(
        (val) => !val.match(/\s/g),
        (val) => ({ message: `The label ${val} cannot contain spaces` })
      )
    )
    .nullable()
    .default(null),
  parent: z.string().nullable().default(null),
  otherFields: Coerced(
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
          maxNumberOfFields: MAX_OTHER_FIELDS_LENGTH,
          fieldName: 'otherFields',
        })
      )
      .nullable()
      .default(null)
  ),
};

export const incidentSchemaObjectProperties = Object.keys(incidentSchemaObject);

export const ExecutorSubActionPushParamsSchema = z.object({
  incident: z.object(incidentSchemaObject).strict(),
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

export const ExecutorSubActionGetIncidentParamsSchema = z
  .object({
    externalId: z.string(),
  })
  .strict();

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = z.object({}).strict();
export const ExecutorSubActionHandshakeParamsSchema = z.object({}).strict();
export const ExecutorSubActionGetCapabilitiesParamsSchema = z.object({}).strict();
export const ExecutorSubActionGetIssueTypesParamsSchema = z.object({}).strict();
export const ExecutorSubActionGetFieldsByIssueTypeParamsSchema = z
  .object({
    id: z.string(),
  })
  .strict();
export const ExecutorSubActionGetIssuesParamsSchema = z.object({ title: z.string() }).strict();
export const ExecutorSubActionGetIssueParamsSchema = z.object({ id: z.string() }).strict();

export const ExecutorParamsSchema = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('getFields'),
      subActionParams: ExecutorSubActionCommonFieldsParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getIncident'),
      subActionParams: ExecutorSubActionGetIncidentParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('handshake'),
      subActionParams: ExecutorSubActionHandshakeParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('pushToService'),
      subActionParams: ExecutorSubActionPushParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('issueTypes'),
      subActionParams: ExecutorSubActionGetIssueTypesParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('fieldsByIssueType'),
      subActionParams: ExecutorSubActionGetFieldsByIssueTypeParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('issues'),
      subActionParams: ExecutorSubActionGetIssuesParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('issue'),
      subActionParams: ExecutorSubActionGetIssueParamsSchema,
    })
    .strict(),
]);
