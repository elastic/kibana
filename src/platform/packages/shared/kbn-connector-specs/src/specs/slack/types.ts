/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// =============================================================================
// Slack Web API response types (minimal shapes used by this connector spec)
// =============================================================================

export interface SlackAssistantSearchContextMessage {
  author_name?: string;
  author_user_id?: string;
  team_id?: string;
  channel_id?: string;
  channel_name?: string;
  message_ts?: string;
  content?: string;
  is_author_bot?: boolean;
  permalink?: string;
  blocks?: unknown;
  context_messages?: unknown;
}

export interface SlackAssistantSearchContextResponse {
  ok: boolean;
  error?: string;
  needed?: string;
  provided?: string;
  results?: {
    messages?: SlackAssistantSearchContextMessage[];
    files?: unknown[];
    channels?: unknown[];
  };
  response_metadata?: { next_cursor?: string };
}

export interface SlackErrorFields {
  error?: string;
  needed?: string;
  provided?: string;
}
