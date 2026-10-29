/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEventId } from '../../event_type_id';

export const SLACK_CONNECTOR_TYPE_ID = '.slack2' as const;

export const SLACK_MESSAGE_EVENT_KEY = 'message' as const;
export const SLACK_APP_MENTION_EVENT_KEY = 'app_mention' as const;
export const SLACK_REACTION_ADDED_EVENT_KEY = 'reaction_added' as const;
export const SLACK_FILE_SHARED_EVENT_KEY = 'file_shared' as const;
export const SLACK_FILE_PUBLIC_EVENT_KEY = 'file_public' as const;
export const SLACK_CHANNEL_CREATED_EVENT_KEY = 'channel_created' as const;
export const SLACK_TEAM_JOIN_EVENT_KEY = 'team_join' as const;
export const SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY = 'member_joined_channel' as const;

export const SLACK_MESSAGE_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_MESSAGE_EVENT_KEY
);
export const SLACK_APP_MENTION_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_APP_MENTION_EVENT_KEY
);
export const SLACK_REACTION_ADDED_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_REACTION_ADDED_EVENT_KEY
);
export const SLACK_FILE_SHARED_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_FILE_SHARED_EVENT_KEY
);
export const SLACK_FILE_PUBLIC_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_FILE_PUBLIC_EVENT_KEY
);
export const SLACK_CHANNEL_CREATED_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_CHANNEL_CREATED_EVENT_KEY
);
export const SLACK_TEAM_JOIN_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_TEAM_JOIN_EVENT_KEY
);
export const SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID = buildEventId(
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY
);
