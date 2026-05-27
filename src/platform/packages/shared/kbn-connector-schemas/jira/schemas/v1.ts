/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { Coerced, validateRecordKeysAllowed, validateRecordMaxKeys } from '../../common/utils';
import { MAX_OTHER_FIELDS_LENGTH } from '../constants';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: z.string(),
  projectKey: z.string(),
};

export const ExternalIncidentServiceConfigurationSchema = lazySchema(() =>
  z.object(ExternalIncidentServiceConfiguration).strict()
);

export const ExternalIncidentServiceSecretConfiguration = {
  email: z.string(),
  apiToken: z.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = lazySchema(() =>
  z.object(ExternalIncidentServiceSecretConfiguration).strict()
);

const incidentSchemaObject = {
  summary: z.string(),
  description: z.string().nullable().default(null),
  externalId: z.string().nullable().default(null),
  issueType: z.string().nullable().default(null),
  priority: z.string().nullable().default(null),
  labels: z
    .array(
      z.string().check((ctx) => {
        if ((ctx.value as string).match(/\s/g)) {
          ctx.issues.push({
            code: 'custom',
            message: `The label ${ctx.value} cannot contain spaces`,
            input: ctx.value,
          });
        }
      })
    )
    .nullable()
    .default(null),
  parent: z.string().nullable().default(null),
  otherFields: Coerced(
    z
      .record(z.string(), z.any())
      .superRefine((val, ctx) => {
        validateRecordKeysAllowed({
          record: val,
          ctx,
          disallowList: incidentSchemaObjectProperties,
          fieldName: 'otherFields',
        });
      })
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

export const ExecutorSubActionPushParamsSchema = lazySchema(() =>
  z.object({
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
  })
);

export const ExecutorSubActionGetIncidentParamsSchema = lazySchema(() =>
  z
    .object({
      externalId: z.string(),
    })
    .strict()
);

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = lazySchema(() => z.object({}).strict());
export const ExecutorSubActionHandshakeParamsSchema = lazySchema(() => z.object({}).strict());
export const ExecutorSubActionGetCapabilitiesParamsSchema = lazySchema(() => z.object({}).strict());
export const ExecutorSubActionGetIssueTypesParamsSchema = lazySchema(() => z.object({}).strict());
export const ExecutorSubActionGetFieldsByIssueTypeParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.string(),
    })
    .strict()
);
export const ExecutorSubActionGetIssuesParamsSchema = lazySchema(() =>
  z.object({ title: z.string() }).strict()
);
export const ExecutorSubActionGetIssueParamsSchema = lazySchema(() =>
  z.object({ id: z.string() }).strict()
);

export const ExecutorParamsSchema = lazySchema(() =>
  z.discriminatedUnion('subAction', [
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
  ])
);
