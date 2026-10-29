/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEventId } from '../../event_type_id';

export const MICROSOFT_TEAMS_CONNECTOR_TYPE_ID = '.microsoft-teams' as const;

export const MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_KEY = 'channel_message' as const;
export const MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_KEY = 'chat_message' as const;
export const MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_KEY = 'channel_created' as const;
export const MICROSOFT_TEAMS_CHAT_CREATED_EVENT_KEY = 'chat_created' as const;
export const MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_KEY = 'team_member_added' as const;

export const MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID = buildEventId(
  MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
  MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_KEY
);
export const MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID = buildEventId(
  MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
  MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_KEY
);
export const MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID = buildEventId(
  MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
  MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_KEY
);
export const MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID = buildEventId(
  MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
  MICROSOFT_TEAMS_CHAT_CREATED_EVENT_KEY
);
export const MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID = buildEventId(
  MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
  MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_KEY
);
