/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';

export const ConfigMap = {
  id: lazySchema(() => z.string()),
  key: lazySchema(() => z.string()),
  name: lazySchema(() => z.string()),
  fieldType: lazySchema(() => z.string()),
};

export const ConfigMapSchema = lazySchema(() => z.object(ConfigMap).strict());

export const ConfigMapping = {
  ruleNameConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
  alertIdConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
  caseIdConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
  caseNameConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
  commentsConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
  severityConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
  descriptionConfig: lazySchema(() => ConfigMapSchema.nullable().default(null)),
};

export const ConfigMappingSchema = lazySchema(() => z.object(ConfigMapping).strict());

export const SwimlaneServiceConfiguration = {
  apiUrl: lazySchema(() => z.string()),
  appId: lazySchema(() => z.string()),
  connectorType: lazySchema(() => z.enum(['all', 'alerts', 'cases'])),
  mappings: ConfigMappingSchema,
};

export const SwimlaneServiceConfigurationSchema = lazySchema(() =>
  z.object(SwimlaneServiceConfiguration).strict()
);

export const SwimlaneSecretsConfiguration = {
  apiToken: lazySchema(() => z.string()),
};

export const SwimlaneSecretsConfigurationSchema = lazySchema(() =>
  z.object(SwimlaneSecretsConfiguration).strict()
);

const SwimlaneFields = {
  alertId: lazySchema(() => z.string().nullable().default(null)),
  ruleName: lazySchema(() => z.string().nullable().default(null)),
  caseId: lazySchema(() => z.string().nullable().default(null)),
  caseName: lazySchema(() => z.string().nullable().default(null)),
  severity: lazySchema(() => z.string().nullable().default(null)),
  description: lazySchema(() => z.string().nullable().default(null)),
};

export const ExecutorSubActionPushParamsSchema = lazySchema(() =>
  z
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
    .strict()
);

export const ExecutorParamsSchema = lazySchema(() =>
  z.discriminatedUnion('subAction', [
    z
      .object({
        subAction: z.literal('pushToService'),
        subActionParams: ExecutorSubActionPushParamsSchema,
      })
      .strict(),
  ])
);
