/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';

export const ConfigMap = {
  id: z.string(),
  key: z.string(),
  name: z.string(),
  fieldType: z.string(),
};

export const ConfigMapSchema = z.object(ConfigMap).strict();

export const ConfigMapping = {
  ruleNameConfig: ConfigMapSchema.nullable().default(null),
  alertIdConfig: ConfigMapSchema.nullable().default(null),
  caseIdConfig: ConfigMapSchema.nullable().default(null),
  caseNameConfig: ConfigMapSchema.nullable().default(null),
  commentsConfig: ConfigMapSchema.nullable().default(null),
  severityConfig: ConfigMapSchema.nullable().default(null),
  descriptionConfig: ConfigMapSchema.nullable().default(null),
};

export const ConfigMappingSchema = z.object(ConfigMapping).strict();

export const SwimlaneServiceConfiguration = {
  apiUrl: z.string(),
  appId: z.string(),
  connectorType: z.enum(['all', 'alerts', 'cases']),
  mappings: ConfigMappingSchema,
};

export const SwimlaneServiceConfigurationSchema = z.object(SwimlaneServiceConfiguration).strict();

export const SwimlaneSecretsConfiguration = {
  apiToken: z.string(),
};

export const SwimlaneSecretsConfigurationSchema = z.object(SwimlaneSecretsConfiguration).strict();

const SwimlaneFields = {
  alertId: z.string().nullable().default(null),
  ruleName: z.string().nullable().default(null),
  caseId: z.string().nullable().default(null),
  caseName: z.string().nullable().default(null),
  severity: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
};

export const ExecutorSubActionPushParamsSchema = z
  .object({
    incident: z
      .object({
        ...SwimlaneFields,
        externalId: z.string().nullable().default(null),
      })
      .strict(),
    comments: z
      .array(z.object({ comment: z.string(), commentId: z.string() }).strict())
      .nullable()
      .default(null),
  })
  .strict();

export const ExecutorParamsSchema = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('pushToService'),
      subActionParams: ExecutorSubActionPushParamsSchema,
    })
    .strict(),
]);
