/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { AuthConfiguration, SecretConfigurationSchema, WebhookMethods } from '../../common/auth';

const HeadersSchema = lazySchema(() => z.record(z.string(), z.string()));

export const ExternalIncidentServiceConfiguration = {
  createIncidentUrl: lazySchema(() => z.string()),
  createIncidentMethod: lazySchema(() =>
    z.enum([WebhookMethods.POST, WebhookMethods.PUT]).default(WebhookMethods.POST)
  ),
  createIncidentJson: lazySchema(() => z.string()), // stringified object
  createIncidentResponseKey: lazySchema(() => z.string()),
  getIncidentMethod: lazySchema(() =>
    z.enum([WebhookMethods.GET, WebhookMethods.POST]).default(WebhookMethods.GET)
  ),
  getIncidentUrl: lazySchema(() => z.string()),
  getIncidentJson: lazySchema(() => z.string().nullable().default(null)),
  getIncidentResponseExternalTitleKey: lazySchema(() => z.string()),
  viewIncidentUrl: lazySchema(() => z.string()),
  updateIncidentUrl: lazySchema(() => z.string()),
  updateIncidentMethod: lazySchema(() =>
    z
      .enum([WebhookMethods.POST, WebhookMethods.PATCH, WebhookMethods.PUT])
      .default(WebhookMethods.PUT)
  ),
  updateIncidentJson: lazySchema(() => z.string()),
  createCommentUrl: lazySchema(() => z.string().nullable().default(null)),
  createCommentMethod: lazySchema(() =>
    z
      .enum([WebhookMethods.POST, WebhookMethods.PUT, WebhookMethods.PATCH])
      .default(WebhookMethods.PUT)
      .nullable()
  ),
  createCommentJson: lazySchema(() => z.string().nullable().default(null)),
  headers: lazySchema(() => HeadersSchema.nullable().default(null)),
  hasAuth: AuthConfiguration.hasAuth,
  authType: AuthConfiguration.authType,
  certType: AuthConfiguration.certType,
  ca: AuthConfiguration.ca,
  verificationMode: AuthConfiguration.verificationMode,
  accessTokenUrl: AuthConfiguration.accessTokenUrl,
  clientId: AuthConfiguration.clientId,
  scope: AuthConfiguration.scope,
  additionalFields: AuthConfiguration.additionalFields,
};

export const ExternalIncidentServiceConfigurationSchema = lazySchema(() =>
  z.object(ExternalIncidentServiceConfiguration).strict()
);

export const ExecutorSubActionPushParamsSchema = lazySchema(() =>
  z
    .object({
      incident: z
        .object({
          title: z.string(),
          description: z.string().nullable().default(null),
          id: z.string().nullable().default(null),
          severity: z.string().nullable().default(null),
          status: z.string().nullable().default(null),
          externalId: z.string().nullable().default(null),
          tags: z.array(z.string()).nullable().default(null),
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

export const ExternalIncidentServiceSecretConfigurationSchema = SecretConfigurationSchema;
