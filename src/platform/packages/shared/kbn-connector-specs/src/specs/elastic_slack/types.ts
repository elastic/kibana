/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const ElasticSlackSendMessageInputSchema = lazySchema(() =>
  z.object({
    channel: z
      .string()
      .min(1)
      .describe(
        'ID of a channel connected to this deployment (e.g. C0123456789). Use listChannels to browse the connected channels. Channels that are not connected are rejected.'
      ),
    text: z.string().min(1).describe('The message text to send'),
    threadTs: z
      .string()
      .optional()
      .describe('Timestamp of another message to reply to (creates a threaded reply)'),
  })
);
export type ElasticSlackSendMessageInput = z.infer<typeof ElasticSlackSendMessageInputSchema>;

export const ElasticSlackListChannelsInputSchema = lazySchema(() => z.object({}));
export type ElasticSlackListChannelsInput = z.infer<typeof ElasticSlackListChannelsInputSchema>;

/** A single connected channel, as surfaced to channel pickers and workflows. */
export interface ElasticSlackChannel {
  /** Slack channel id — the value `sendMessage` expects in `channel`. */
  id: string;
  /** Display name from the Relay's persisted snapshot, falling back to the id. */
  name: string;
}
