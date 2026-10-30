/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The slice of the Actions plugin's Relay client that action handlers use. Declared structurally so
 * this package does not depend on x-pack; the concrete `RelayClient` satisfies it by shape.
 */
export interface RelayActionClient {
  trigger(input: {
    tenantKey: string;
    /** Slack conversation id or a connected channel name (`#general`). */
    channel: string;
    message: string;
    threadTs?: string;
    /** Edits this previously posted message instead of posting a new one. */
    messageTs?: string;
  }): Promise<{ ref: string; channel: string; externalConversationId?: string }>;
  /** One page of the channels this deployment has connected; follow `nextCursor` for the rest. */
  listBindings(
    tenantKey: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<{
    bindings: Array<{
      scope_id?: string;
      display_name?: string;
      visibility?: 'public' | 'private';
    }>;
    nextCursor?: string;
  }>;
  /** A window of a bound public channel, newest first. */
  readMessages(input: RelayReadInput): Promise<RelayReadResult>;
}

interface RelayReadInput {
  tenantKey: string;
  channelId: string;
  oldest?: string;
  latest?: string;
  limit?: number;
}

interface RelayReadResult {
  channel: { id: string; name: string };
  messages: Array<{
    ts: string;
    threadTs?: string;
    replyCount?: number;
    author: { id?: string; name?: string; isBot: boolean };
    text: string;
  }>;
  truncated: boolean;
}
