/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConnectorIngressContext,
  ConnectorSpecEvents,
  EventPayload,
  HandleEventsResult,
} from '../../connector_spec_events';
import { MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH } from '../../handle_events_result';
import {
  MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID,
  MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_KEY,
  MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID,
  MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_KEY,
  MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID,
  MICROSOFT_TEAMS_CHAT_CREATED_EVENT_KEY,
  MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID,
  MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_KEY,
  MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID,
  MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_KEY,
} from './constants';

const TEAMS_ID_MAX = 1024;
const ENTRA_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GRAPH_RESOURCE_PREFIX = /^https:\/\/graph\.microsoft\.com\/v1\.0\//i;
const ODATA_SEGMENT = /^([A-Za-z]+)[(](?:'([^']*)'|"([^"]*)")[)]$/;
const RESOURCE_COLLECTIONS = new Set([
  'teams',
  'channels',
  'messages',
  'replies',
  'chats',
  'members',
  'users',
]);
const SKIP_RESOURCE_IDS = new Set(['getAllMessages', 'getAllChannels']);

const teamsId = (description: string) => z.string().min(1).max(TEAMS_ID_MAX).describe(description);

const optionalTeamsId = (description: string) => teamsId(description).optional();

const tenantIdField = () => optionalTeamsId('Entra tenant id, when the notification includes one.');

const ChannelMessageEventSchema = lazySchema(() =>
  z.object({
    team_id: teamsId('Team that owns the channel.'),
    channel_id: teamsId('Channel the message was posted in.'),
    message_id: teamsId('Id of the posted message.'),
    tenant_id: tenantIdField(),
  })
);

const ChatMessageEventSchema = lazySchema(() =>
  z.object({
    chat_id: teamsId('Chat the message was posted in.'),
    message_id: teamsId('Id of the posted message.'),
    tenant_id: tenantIdField(),
  })
);

const ChannelCreatedEventSchema = lazySchema(() =>
  z.object({
    team_id: teamsId('Team the channel was created in.'),
    channel_id: teamsId('Id of the created channel.'),
    tenant_id: tenantIdField(),
  })
);

const ChatCreatedEventSchema = lazySchema(() =>
  z.object({
    chat_id: teamsId('Id of the created chat.'),
    tenant_id: tenantIdField(),
  })
);

const TeamMemberAddedEventSchema = lazySchema(() =>
  z.object({
    team_id: teamsId('Team the member was added to.'),
    user_id: teamsId('Entra user id of the added member.'),
    tenant_id: tenantIdField(),
  })
);

interface NamedTeamsEvent {
  readonly eventId: string;
  readonly payload: Record<string, string>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readBoundedString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    return undefined;
  }
  return value;
};

const readId = (value: unknown): string | undefined => readBoundedString(value, TEAMS_ID_MAX);

const decodeMembershipId = (membershipId: string): string | undefined => {
  const remainder = membershipId.length % 4;
  const padded =
    remainder === 0
      ? membershipId
      : membershipId.padEnd(membershipId.length + (4 - remainder), '=');
  try {
    return atob(padded);
  } catch {
    return undefined;
  }
};

/**
 * A basic member notification has no userId. The membership id is base64 of
 * `{team-id}##{user-id}` or `0##{tenant-id}##{user-id}`.
 */
const userIdFromMembershipId = (
  membershipId: string,
  teamId: string,
  tenantId: string | undefined
): string | undefined => {
  const decoded = decodeMembershipId(membershipId);
  if (decoded === undefined) {
    return undefined;
  }
  const parts = decoded.split('##');
  if (parts.length === 2) {
    const [encodedTeamId, userId] = parts;
    if (encodedTeamId.toLowerCase() !== teamId.toLowerCase() || !ENTRA_GUID.test(userId)) {
      return undefined;
    }
    return userId;
  }
  if (parts.length === 3) {
    const [prefix, encodedTenantId, userId] = parts;
    if (prefix !== '0' || !ENTRA_GUID.test(encodedTenantId) || !ENTRA_GUID.test(userId)) {
      return undefined;
    }
    if (tenantId !== undefined && encodedTenantId.toLowerCase() !== tenantId.toLowerCase()) {
      return undefined;
    }
    return userId;
  }
  return undefined;
};

const omitUndefined = (fields: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(fields).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );

const odataTypeName = (resourceData: Record<string, unknown>): string | undefined => {
  const raw = resourceData['@odata.type'];
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  return raw.split('.').pop()?.toLowerCase();
};

const rememberResourceId = (ids: Record<string, string>, name: string, id: string): void => {
  const collection = name.toLowerCase();
  if (!RESOURCE_COLLECTIONS.has(collection)) {
    return;
  }
  if (id.length === 0 || id.length > TEAMS_ID_MAX || SKIP_RESOURCE_IDS.has(id)) {
    return;
  }
  ids[collection] = id;
};

const isResourceIdSegment = (segment: string): boolean =>
  !RESOURCE_COLLECTIONS.has(segment.toLowerCase()) &&
  !segment.includes('(') &&
  segment.length <= TEAMS_ID_MAX &&
  !SKIP_RESOURCE_IDS.has(segment);

/** Ids from a Graph resource path. Skips subscription wildcards such as getAllMessages. */
const readResourceIds = (resource: unknown): Record<string, string> => {
  if (typeof resource !== 'string' || resource.length === 0) {
    return {};
  }
  let path = resource.trim().replace(GRAPH_RESOURCE_PREFIX, '');
  if (path.startsWith('/')) {
    path = path.slice(1);
  }
  const segments = path.split('/').filter((segment) => segment.length > 0);
  const ids: Record<string, string> = {};
  let index = 0;
  while (index < segments.length) {
    const segment = segments[index];
    const odata = ODATA_SEGMENT.exec(segment);
    if (odata) {
      rememberResourceId(ids, odata[1], odata[2] ?? odata[3] ?? '');
      index += 1;
      continue;
    }
    const next = segments[index + 1];
    if (next !== undefined && isResourceIdSegment(next)) {
      rememberResourceId(ids, segment, next);
      index += 2;
      continue;
    }
    index += 1;
  }
  return ids;
};

const withTenant = (
  item: Record<string, unknown>,
  fields: Record<string, string | undefined>
): Record<string, string> => omitUndefined({ ...fields, tenant_id: readId(item.tenantId) });

const classifyNotification = (item: Record<string, unknown>): NamedTeamsEvent | undefined => {
  const changeType = item.changeType;
  if (typeof changeType !== 'string' || changeType.toLowerCase() !== 'created') {
    return undefined;
  }
  if (!isPlainObject(item.resourceData)) {
    return undefined;
  }
  const typeName = odataTypeName(item.resourceData);
  if (typeName === undefined) {
    return undefined;
  }
  const ids = readResourceIds(item.resource);

  if (typeName === 'chatmessage') {
    const messageId = ids.replies ?? ids.messages ?? readId(item.resourceData.id);
    if (ids.teams !== undefined && ids.channels !== undefined && messageId !== undefined) {
      return {
        eventId: MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID,
        payload: withTenant(item, {
          team_id: ids.teams,
          channel_id: ids.channels,
          message_id: messageId,
        }),
      };
    }
    if (ids.chats !== undefined && messageId !== undefined) {
      return {
        eventId: MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID,
        payload: withTenant(item, { chat_id: ids.chats, message_id: messageId }),
      };
    }
    return undefined;
  }

  if (typeName === 'channel' && ids.teams !== undefined && ids.channels !== undefined) {
    return {
      eventId: MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID,
      payload: withTenant(item, { team_id: ids.teams, channel_id: ids.channels }),
    };
  }

  if (
    typeName === 'chat' &&
    ids.chats !== undefined &&
    ids.messages === undefined &&
    ids.members === undefined
  ) {
    return {
      eventId: MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID,
      payload: withTenant(item, { chat_id: ids.chats }),
    };
  }

  if (
    typeName.endsWith('conversationmember') &&
    ids.teams !== undefined &&
    ids.channels === undefined &&
    ids.members !== undefined
  ) {
    const userId =
      readId(item.resourceData.userId) ??
      userIdFromMembershipId(ids.members, ids.teams, readId(item.tenantId));
    if (userId === undefined) {
      return undefined;
    }
    return {
      eventId: MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID,
      payload: withTenant(item, { team_id: ids.teams, user_id: userId }),
    };
  }

  return undefined;
};

const validationToken = (ctx: ConnectorIngressContext): string | undefined => {
  const token = ctx.query?.validationToken;
  if (typeof token !== 'string' || token.length === 0) {
    return undefined;
  }
  return token;
};

const notificationItems = (rawBody: unknown): unknown[] | undefined => {
  if (!isPlainObject(rawBody) || !Array.isArray(rawBody.value)) {
    return undefined;
  }
  return rawBody.value;
};

const isLifecycleItem = (item: unknown): boolean =>
  isPlainObject(item) && typeof item.lifecycleEvent === 'string' && item.lifecycleEvent.length > 0;

const correlationKeyFor = (item: Record<string, unknown>): string => {
  const notificationId = readBoundedString(item.id, MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH);
  if (notificationId !== undefined) {
    return notificationId;
  }
  return uuidv4();
};

const handleMicrosoftTeamsEvents = async (
  ctx: ConnectorIngressContext
): Promise<HandleEventsResult> => {
  const token = validationToken(ctx);
  if (token !== undefined) {
    return {
      type: 'http',
      httpResponse: {
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: token,
      },
    };
  }

  const items = notificationItems(ctx.rawBody);
  if (items === undefined) {
    return { type: 'emit', events: [] };
  }
  const changeItems = items.filter((item) => !isLifecycleItem(item));
  if (changeItems.length === 0) {
    return { type: 'emit', events: [] };
  }

  const events: EventPayload[] = [];
  for (const item of changeItems) {
    if (!isPlainObject(item)) {
      continue;
    }
    const named = classifyNotification(item);
    if (named === undefined) {
      continue;
    }
    events.push({
      eventId: named.eventId,
      correlationKey: correlationKeyFor(item),
      payload: named.payload,
    });
  }

  return { type: 'emit', events };
};

export const microsoftTeamsEvents: ConnectorSpecEvents = {
  definitions: {
    [MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_KEY]: {
      eventId: MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID,
      title: i18n.translate('connectorSpecs.microsoftTeams.events.channelMessage.title', {
        defaultMessage: 'Channel message posted',
      }),
      description: i18n.translate(
        'connectorSpecs.microsoftTeams.events.channelMessage.description',
        {
          defaultMessage:
            'A message was posted in a Teams channel. The event includes the team, channel, and message ids. For a reply, message_id is the reply. Message content is not included.',
        }
      ),
      eventSchema: ChannelMessageEventSchema,
    },
    [MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_KEY]: {
      eventId: MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID,
      title: i18n.translate('connectorSpecs.microsoftTeams.events.chatMessage.title', {
        defaultMessage: 'Chat message received',
      }),
      description: i18n.translate('connectorSpecs.microsoftTeams.events.chatMessage.description', {
        defaultMessage:
          'A message was posted in a Teams chat. The event includes the chat and message ids. Message content is not included.',
      }),
      eventSchema: ChatMessageEventSchema,
    },
    [MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_KEY]: {
      eventId: MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID,
      title: i18n.translate('connectorSpecs.microsoftTeams.events.channelCreated.title', {
        defaultMessage: 'Channel created',
      }),
      description: i18n.translate(
        'connectorSpecs.microsoftTeams.events.channelCreated.description',
        { defaultMessage: 'A channel was created in a team.' }
      ),
      eventSchema: ChannelCreatedEventSchema,
    },
    [MICROSOFT_TEAMS_CHAT_CREATED_EVENT_KEY]: {
      eventId: MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID,
      title: i18n.translate('connectorSpecs.microsoftTeams.events.chatCreated.title', {
        defaultMessage: 'Chat created',
      }),
      description: i18n.translate('connectorSpecs.microsoftTeams.events.chatCreated.description', {
        defaultMessage: 'A Teams chat was created.',
      }),
      eventSchema: ChatCreatedEventSchema,
    },
    [MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_KEY]: {
      eventId: MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID,
      title: i18n.translate('connectorSpecs.microsoftTeams.events.teamMemberAdded.title', {
        defaultMessage: 'Team member added',
      }),
      description: i18n.translate(
        'connectorSpecs.microsoftTeams.events.teamMemberAdded.description',
        { defaultMessage: 'A user was added to a team.' }
      ),
      eventSchema: TeamMemberAddedEventSchema,
    },
  },
  handleEvents: handleMicrosoftTeamsEvents,
};
