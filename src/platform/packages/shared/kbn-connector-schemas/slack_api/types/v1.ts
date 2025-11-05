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
  SlackApiConfigSchema,
  SlackApiSecretsSchema,
  ValidChannelIdSubActionParamsSchema,
  PostMessageSubActionParamsSchema,
  PostBlockkitSubActionParamsSchema,
  PostMessageParamsSchema,
  PostBlockkitParamsSchema,
  GetConversationsListSubActionParamsSchema,
  GetConversationsListParamsSchema,
  GetConversationsHistorySubActionParamsSchema,
  GetConversationsHistoryParamsSchema,
  GetConversationsRepliesSubActionParamsSchema,
  GetConversationsRepliesParamsSchema,
  GetUsersListSubActionParamsSchema,
  GetUsersListParamsSchema,
  GetChannelDigestSubActionParamsSchema,
  GetChannelDigestParamsSchema,
  SlackApiParamsSchema,
} from '../schemas/v1';

export type SlackApiConfig = z.infer<typeof SlackApiConfigSchema>;
export type SlackApiSecrets = z.infer<typeof SlackApiSecretsSchema>;
export type PostMessageParams = z.infer<typeof PostMessageParamsSchema>;
export type PostMessageSubActionParams = z.infer<typeof PostMessageSubActionParamsSchema>;
export type PostBlockkitSubActionParams = z.infer<typeof PostBlockkitSubActionParamsSchema>;
export type PostBlockkitParams = z.infer<typeof PostBlockkitParamsSchema>;
export type ValidChannelIdSubActionParams = z.infer<typeof ValidChannelIdSubActionParamsSchema>;
export type GetConversationsListSubActionParams = z.infer<
  typeof GetConversationsListSubActionParamsSchema
>;
export type GetConversationsListParams = z.infer<typeof GetConversationsListParamsSchema>;
export type GetConversationsHistorySubActionParams = z.infer<
  typeof GetConversationsHistorySubActionParamsSchema
>;
export type GetConversationsHistoryParams = z.infer<typeof GetConversationsHistoryParamsSchema>;
export type GetConversationsRepliesSubActionParams = z.infer<
  typeof GetConversationsRepliesSubActionParamsSchema
>;
export type GetConversationsRepliesParams = z.infer<typeof GetConversationsRepliesParamsSchema>;
export type GetUsersListSubActionParams = z.infer<typeof GetUsersListSubActionParamsSchema>;
export type GetUsersListParams = z.infer<typeof GetUsersListParamsSchema>;
export type GetChannelDigestSubActionParams = z.infer<typeof GetChannelDigestSubActionParamsSchema>;
export type GetChannelDigestParams = z.infer<typeof GetChannelDigestParamsSchema>;
export type SlackApiParams = z.infer<typeof SlackApiParamsSchema>;
export type SlackApiActionParams = z.infer<typeof SlackApiParamsSchema>;
