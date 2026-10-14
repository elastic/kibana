/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorIngressContext, HandleEventsResult } from '../../connector_spec_events';
import { buildEventId } from '../../event_type_id';
import { MAX_HANDLE_EVENTS_EVENTS } from '../../handle_events_result';
import { validateEmittedEvents } from '../../validate_emitted_events';
import {
  MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID,
  MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_KEY,
  MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID,
  MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_KEY,
  MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID,
  MICROSOFT_TEAMS_CHAT_CREATED_EVENT_KEY,
  MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID,
  MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_KEY,
  MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
  MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID,
  MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_KEY,
} from './constants';
import { MicrosoftTeams } from './microsoft_teams';

const NAMED_TEAMS_EVENTS = [
  [MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_KEY, MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID],
  [MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_KEY, MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID],
  [MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_KEY, MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID],
  [MICROSOFT_TEAMS_CHAT_CREATED_EVENT_KEY, MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID],
  [MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_KEY, MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID],
] as const;

describe('Microsoft Teams inbound events', () => {
  const { events } = MicrosoftTeams;
  if (events === undefined) {
    throw new Error('Microsoft Teams must declare events');
  }

  const createContext = (
    rawBody: unknown,
    query?: Record<string, string>
  ): ConnectorIngressContext => ({
    spaceId: 'default',
    log: loggerMock.create(),
    connectorId: 'teams-connector',
    connectorTypeId: MICROSOFT_TEAMS_CONNECTOR_TYPE_ID,
    config: {},
    rawBody,
    ...(query !== undefined ? { query } : {}),
  });

  const expectEmit = (result: HandleEventsResult) => {
    expect(result.type).toBe('emit');
    if (result.type !== 'emit') {
      throw new Error('expected emit');
    }
    return result;
  };

  const notification = (item: Record<string, unknown>, id = 'notification-1') => ({
    value: [{ id, changeType: 'created', tenantId: 'tenant-1', ...item }],
  });

  it('declares the named catalog and not any', () => {
    expect(Object.keys(events.definitions).sort()).toEqual(
      NAMED_TEAMS_EVENTS.map(([key]) => key).sort()
    );
    expect(events.definitions.any).toBeUndefined();
    for (const [eventKey, eventId] of NAMED_TEAMS_EVENTS) {
      expect(events.definitions[eventKey]?.eventId).toBe(eventId);
      expect(eventId).toBe(buildEventId(MICROSOFT_TEAMS_CONNECTOR_TYPE_ID, eventKey));
    }
    expect(MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID).toBe('microsoft-teams.channel_message');
  });

  it('echoes validationToken as text/plain and emits nothing', async () => {
    const result = await events.handleEvents(
      createContext({ value: [] }, { validationToken: 'graph-token' })
    );
    expect(result).toEqual({
      type: 'http',
      httpResponse: {
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: 'graph-token',
      },
    });
  });

  it('acks a lifecycle notification without emitting', async () => {
    const result = await events.handleEvents(
      createContext({
        value: [
          {
            lifecycleEvent: 'reauthorizationRequired',
            changeType: 'created',
            resource: "teams('team-1')/channels('channel-1')/messages('message-1')",
          },
        ],
      })
    );
    expect(result).toEqual({ type: 'http', httpResponse: { status: 202 } });
  });

  it('emits a channel message from the plaintext resource path', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          notification({
            resource:
              "https://graph.microsoft.com/v1.0/teams('team-1')/channels('channel-1')/messages('message-1')",
            resourceData: {
              '@odata.type': '#Microsoft.Graph.chatMessage',
              id: 'message-1',
            },
            encryptedContent: { data: 'ciphertext', dataKey: 'wrapped-key' },
          })
        )
      )
    );
    expect(result.events).toEqual([
      {
        eventId: MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID,
        correlationKey: 'notification-1',
        payload: {
          team_id: 'team-1',
          channel_id: 'channel-1',
          message_id: 'message-1',
          tenant_id: 'tenant-1',
        },
      },
    ]);
    expect(JSON.stringify(result.events)).not.toContain('ciphertext');
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('emits a channel reply id rather than the root message id', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          notification({
            resource: "teams('team-1')/channels('channel-1')/messages('root-1')/replies('reply-1')",
            resourceData: {
              '@odata.type': '#Microsoft.Graph.chatMessage',
              id: 'reply-1',
            },
          })
        )
      )
    );
    expect(result.events[0]).toMatchObject({
      eventId: MICROSOFT_TEAMS_CHANNEL_MESSAGE_EVENT_ID,
      payload: {
        team_id: 'team-1',
        channel_id: 'channel-1',
        message_id: 'reply-1',
        tenant_id: 'tenant-1',
      },
    });
  });

  it('emits a chat message from a slash resource path', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          notification({
            changeType: 'Created',
            resource: 'chats/chat-1/messages/message-1',
            resourceData: { '@odata.type': '#microsoft.graph.chatMessage', id: 'message-1' },
          })
        )
      )
    );
    expect(result.events[0]).toMatchObject({
      eventId: MICROSOFT_TEAMS_CHAT_MESSAGE_EVENT_ID,
      payload: { chat_id: 'chat-1', message_id: 'message-1', tenant_id: 'tenant-1' },
    });
  });

  it('emits channel created, chat created, and team member added', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          value: [
            {
              id: 'n-channel',
              changeType: 'created',
              resource: 'teams/team-1/channels/channel-1',
              resourceData: { '@odata.type': '#microsoft.graph.channel', id: 'channel-1' },
            },
            {
              id: 'n-chat',
              changeType: 'created',
              resource: 'chats("chat-1")',
              resourceData: { '@odata.type': '#microsoft.graph.chat', id: 'chat-1' },
            },
            {
              id: 'n-member',
              changeType: 'created',
              tenantId: 'tenant-1',
              resource: "teams('team-1')/members('membership-1')",
              resourceData: {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                id: 'membership-1',
                userId: 'user-1',
              },
            },
          ],
        })
      )
    );
    expect(result.events).toEqual([
      {
        eventId: MICROSOFT_TEAMS_CHANNEL_CREATED_EVENT_ID,
        correlationKey: 'n-channel',
        payload: { team_id: 'team-1', channel_id: 'channel-1' },
      },
      {
        eventId: MICROSOFT_TEAMS_CHAT_CREATED_EVENT_ID,
        correlationKey: 'n-chat',
        payload: { chat_id: 'chat-1' },
      },
      {
        eventId: MICROSOFT_TEAMS_TEAM_MEMBER_ADDED_EVENT_ID,
        correlationKey: 'n-member',
        payload: { team_id: 'team-1', user_id: 'user-1', tenant_id: 'tenant-1' },
      },
    ]);
    expect(result.events[2].payload.user_id).not.toBe('membership-1');
  });

  it('emits nothing for updates, unknown types, and paths without the required ids', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          value: [
            {
              id: 'updated',
              changeType: 'updated',
              resource: "teams('team-1')/channels('channel-1')/messages('message-1')",
              resourceData: { '@odata.type': '#microsoft.graph.chatMessage', id: 'message-1' },
            },
            {
              id: 'unknown',
              changeType: 'created',
              resource: "teams('team-1')",
              resourceData: { '@odata.type': '#microsoft.graph.team', id: 'team-1' },
            },
            {
              id: 'wildcard',
              changeType: 'created',
              resource: 'teams/getAllMessages',
              resourceData: { '@odata.type': '#microsoft.graph.chatMessage', id: 'message-1' },
            },
            {
              id: 'member-without-user',
              changeType: 'created',
              resource: "teams('team-1')/members('membership-1')",
              resourceData: {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                id: 'membership-1',
              },
            },
          ],
        })
      )
    );
    expect(result.events).toEqual([]);
  });

  it('drops notifications past the emit cap', async () => {
    const log = loggerMock.create();
    const value = Array.from({ length: MAX_HANDLE_EVENTS_EVENTS + 2 }, (_, index) => ({
      id: `notification-${index}`,
      changeType: 'created',
      resource: `chats/chat-${index}`,
      resourceData: { '@odata.type': '#microsoft.graph.chat', id: `chat-${index}` },
    }));
    const result = expectEmit(
      await events.handleEvents({
        ...createContext({ value }),
        log,
      })
    );
    expect(result.events).toHaveLength(MAX_HANDLE_EVENTS_EVENTS);
    expect(log.warn).toHaveBeenCalledWith('inbound_events_dropped count=2');
  });

  it('uses a generated correlation key when the notification id is too long', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          notification(
            {
              resource: 'chats/chat-1',
              resourceData: { '@odata.type': '#microsoft.graph.chat', id: 'chat-1' },
            },
            'x'.repeat(129)
          )
        )
      )
    );
    expect(result.events[0].correlationKey).not.toBe('x'.repeat(129));
    expect(result.events[0].correlationKey).toHaveLength(36);
  });
});
