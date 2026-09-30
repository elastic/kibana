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
import { validateEmittedEvents } from '../../validate_emitted_events';
import {
  SLACK_APP_MENTION_EVENT_ID,
  SLACK_APP_MENTION_EVENT_KEY,
  SLACK_CHANNEL_CREATED_EVENT_ID,
  SLACK_CHANNEL_CREATED_EVENT_KEY,
  SLACK_CONNECTOR_TYPE_ID,
  SLACK_FILE_PUBLIC_EVENT_ID,
  SLACK_FILE_PUBLIC_EVENT_KEY,
  SLACK_FILE_SHARED_EVENT_ID,
  SLACK_FILE_SHARED_EVENT_KEY,
  SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID,
  SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY,
  SLACK_MESSAGE_EVENT_ID,
  SLACK_MESSAGE_EVENT_KEY,
  SLACK_REACTION_ADDED_EVENT_ID,
  SLACK_REACTION_ADDED_EVENT_KEY,
  SLACK_SLASH_COMMAND_EVENT_ID,
  SLACK_SLASH_COMMAND_EVENT_KEY,
  SLACK_TEAM_JOIN_EVENT_ID,
  SLACK_TEAM_JOIN_EVENT_KEY,
} from './constants';
import { Slack } from './slack';

const NAMED_SLACK_EVENTS = [
  [SLACK_MESSAGE_EVENT_KEY, SLACK_MESSAGE_EVENT_ID],
  [SLACK_APP_MENTION_EVENT_KEY, SLACK_APP_MENTION_EVENT_ID],
  [SLACK_REACTION_ADDED_EVENT_KEY, SLACK_REACTION_ADDED_EVENT_ID],
  [SLACK_FILE_SHARED_EVENT_KEY, SLACK_FILE_SHARED_EVENT_ID],
  [SLACK_FILE_PUBLIC_EVENT_KEY, SLACK_FILE_PUBLIC_EVENT_ID],
  [SLACK_CHANNEL_CREATED_EVENT_KEY, SLACK_CHANNEL_CREATED_EVENT_ID],
  [SLACK_TEAM_JOIN_EVENT_KEY, SLACK_TEAM_JOIN_EVENT_ID],
  [SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY, SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID],
  [SLACK_SLASH_COMMAND_EVENT_KEY, SLACK_SLASH_COMMAND_EVENT_ID],
] as const;

describe('Slack inbound events', () => {
  const { events } = Slack;
  if (events === undefined) {
    throw new Error('Slack must declare events');
  }

  const createContext = (rawBody: unknown): ConnectorIngressContext => ({
    spaceId: 'default',
    log: loggerMock.create(),
    connectorId: 'slack-connector',
    connectorTypeId: SLACK_CONNECTOR_TYPE_ID,
    config: {},
    rawBody,
  });

  const expectEmit = (result: HandleEventsResult) => {
    expect(result.type).toBe('emit');
    if (result.type !== 'emit') {
      throw new Error('expected emit');
    }
    return result;
  };

  const callback = (event: Record<string, unknown>, envelope: Record<string, unknown> = {}) => ({
    type: 'event_callback',
    team_id: 'T123',
    event_id: 'Ev123',
    event,
    ...envelope,
  });

  it('declares the named catalog and not any', () => {
    expect(Object.keys(events.definitions).sort()).toEqual(
      NAMED_SLACK_EVENTS.map(([key]) => key).sort()
    );
    expect(events.definitions.any).toBeUndefined();

    for (const [eventKey, eventId] of NAMED_SLACK_EVENTS) {
      expect(events.definitions[eventKey]?.eventId).toBe(eventId);
      expect(eventId).toBe(buildEventId(SLACK_CONNECTOR_TYPE_ID, eventKey));
    }
    expect(SLACK_APP_MENTION_EVENT_ID).toBe('slack2.app_mention');
    expect(SLACK_SLASH_COMMAND_EVENT_ID).toBe('slack2.slash_command');
  });

  it('emits a posted message with subtype and bot identity when present', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'message',
            channel: 'C123',
            user: 'U123',
            text: 'hello',
            ts: '1355517523.000005',
            thread_ts: '1355517523.000001',
            subtype: 'bot_message',
            bot_id: 'B123',
          })
        )
      )
    );

    expect(result.events).toEqual([
      {
        eventId: SLACK_MESSAGE_EVENT_ID,
        correlationKey: 'Ev123',
        payload: {
          workspace: 'T123',
          channel: 'C123',
          messageId: '1355517523.000005',
          threadId: '1355517523.000001',
          sender: 'U123',
          text: 'hello',
          subtype: 'bot_message',
          botId: 'B123',
        },
      },
    ]);
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('uses the original message id when a message is changed', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'message',
            subtype: 'message_changed',
            channel: 'C123',
            ts: '1358878755.000001',
            message: {
              user: 'U123',
              text: 'edited',
              ts: '1355517523.000005',
            },
          })
        )
      )
    );

    expect(result.events[0]?.payload).toEqual({
      workspace: 'T123',
      channel: 'C123',
      messageId: '1355517523.000005',
      sender: 'U123',
      text: 'edited',
      subtype: 'message_changed',
    });
  });

  it('uses the deleted message id when a message is deleted', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'message',
            subtype: 'message_deleted',
            channel: 'C123',
            ts: '1358878755.000001',
            deleted_ts: '1358878749.000002',
            previous_message: {
              user: 'U123',
              text: 'hello',
              ts: '1358878749.000002',
            },
          })
        )
      )
    );

    expect(result.events[0]).toMatchObject({
      eventId: SLACK_MESSAGE_EVENT_ID,
      payload: {
        workspace: 'T123',
        channel: 'C123',
        messageId: '1358878749.000002',
        sender: 'U123',
        text: 'hello',
        subtype: 'message_deleted',
      },
    });
  });

  it('emits an app mention', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'app_mention',
            user: 'U123',
            text: '<@UAPP> hello',
            ts: '1515449522.000016',
            thread_ts: '1515449522.000010',
            channel: 'C123',
          })
        )
      )
    );

    expect(result.events[0]).toEqual({
      eventId: SLACK_APP_MENTION_EVENT_ID,
      correlationKey: 'Ev123',
      payload: {
        workspace: 'T123',
        channel: 'C123',
        messageId: '1515449522.000016',
        threadId: '1515449522.000010',
        sender: 'U123',
        text: '<@UAPP> hello',
      },
    });
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('emits a reaction against the target message', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'reaction_added',
            user: 'U123',
            reaction: 'thumbsup',
            item: { type: 'message', channel: 'C123', ts: '1360782400.498405' },
          })
        )
      )
    );

    expect(result.events[0]?.payload).toEqual({
      channel: 'C123',
      messageId: '1360782400.498405',
      itemType: 'message',
      user: 'U123',
      reaction: 'thumbsup',
    });
    expect(result.events[0]?.eventId).toBe(SLACK_REACTION_ADDED_EVENT_ID);
  });

  it('emits a reaction against a file and a file comment', async () => {
    const fileResult = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'reaction_added',
            user: 'U123',
            reaction: 'thumbsup',
            item: { type: 'file', file: 'F123' },
          })
        )
      )
    );
    const commentResult = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'reaction_added',
            user: 'U123',
            reaction: 'thumbsup',
            item: { type: 'file_comment', file: 'F123', file_comment: 'Fc123' },
          })
        )
      )
    );

    expect(fileResult.events[0]?.payload).toEqual({
      fileId: 'F123',
      itemType: 'file',
      user: 'U123',
      reaction: 'thumbsup',
    });
    expect(commentResult.events[0]?.payload).toEqual({
      fileId: 'F123',
      fileCommentId: 'Fc123',
      itemType: 'file_comment',
      user: 'U123',
      reaction: 'thumbsup',
    });
    expect(fileResult.events[0]?.eventId).toBe(SLACK_REACTION_ADDED_EVENT_ID);
    expect(commentResult.events[0]?.eventId).toBe(SLACK_REACTION_ADDED_EVENT_ID);
    expect(validateEmittedEvents(events.definitions, fileResult.events)).toEqual({ ok: true });
    expect(validateEmittedEvents(events.definitions, commentResult.events)).toEqual({ ok: true });
  });

  it('emits a shared file and omits channel when Slack does not send one', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'file_shared',
            file_id: 'F123',
            user_id: 'U123',
          })
        )
      )
    );

    expect(result.events[0]?.payload).toEqual({
      fileId: 'F123',
      user: 'U123',
    });
    expect(result.events[0]?.eventId).toBe(SLACK_FILE_SHARED_EVENT_ID);
  });

  it('emits a file made public with the actor when present', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'file_public',
            file_id: 'F123',
            user_id: 'U123',
          })
        )
      )
    );

    expect(result.events[0]).toMatchObject({
      eventId: SLACK_FILE_PUBLIC_EVENT_ID,
      payload: { fileId: 'F123', userId: 'U123' },
    });
  });

  it('emits a created public channel', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'channel_created',
            channel: { id: 'C123', name: 'fun', creator: 'U123' },
          })
        )
      )
    );

    expect(result.events[0]).toMatchObject({
      eventId: SLACK_CHANNEL_CREATED_EVENT_ID,
      payload: { channelId: 'C123', name: 'fun', creator: 'U123' },
    });
  });

  it('emits a workspace join with the available profile fields', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'team_join',
            user: {
              id: 'U123',
              name: 'bobby',
              real_name: 'Bobby Tables',
              profile: {
                email: 'bobby@example.com',
                display_name: 'bobby',
              },
            },
          })
        )
      )
    );

    expect(result.events[0]).toMatchObject({
      eventId: SLACK_TEAM_JOIN_EVENT_ID,
      payload: {
        userId: 'U123',
        name: 'bobby',
        realName: 'Bobby Tables',
        displayName: 'bobby',
        email: 'bobby@example.com',
      },
    });
  });

  it('emits a channel join and omits inviter when Slack does not send one', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext(
          callback({
            type: 'member_joined_channel',
            user: 'U123',
            channel: 'C123',
          })
        )
      )
    );

    expect(result.events[0]).toMatchObject({
      eventId: SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID,
      payload: { userId: 'U123', channelId: 'C123' },
    });
    expect(result.events[0]?.payload).not.toHaveProperty('inviter');
  });

  it('emits a slash command and acks with HTTP 200', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          token: 'deprecated-verification-token',
          team_id: 'T123',
          channel_id: 'C123',
          channel_name: 'general',
          user_id: 'U123',
          user_name: 'ada',
          command: '/investigate',
          text: 'host-1',
          api_app_id: 'A123',
          response_url: 'https://hooks.slack.com/commands/T123/1/secret',
          trigger_id: '13345224609.738474920.8088930838d88f008e0',
        })
      )
    );

    expect(result.httpResponse).toEqual({ status: 200 });
    expect(result.events).toEqual([
      {
        eventId: SLACK_SLASH_COMMAND_EVENT_ID,
        correlationKey: '13345224609.738474920.8088930838d88f008e0',
        payload: {
          workspace: 'T123',
          channel: 'C123',
          channelName: 'general',
          user: 'U123',
          userName: 'ada',
          command: '/investigate',
          text: 'host-1',
          responseUrl: 'https://hooks.slack.com/commands/T123/1/secret',
          apiAppId: 'A123',
        },
      },
    ]);
    expect(result.events[0]?.payload).not.toHaveProperty('token');
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('omits an empty slash command text and a non-https response url', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          team_id: 'T123',
          channel_id: 'C123',
          user_id: 'U123',
          command: '/investigate',
          text: '',
          response_url: 'http://hooks.slack.com/commands/T123/1/secret',
          trigger_id: 'trig-1',
        })
      )
    );

    expect(result.events[0]?.payload).toEqual({
      workspace: 'T123',
      channel: 'C123',
      user: 'U123',
      command: '/investigate',
    });
  });

  it('assigns a distinct correlation key when a slash command omits trigger_id', async () => {
    const rawBody = {
      team_id: 'T123',
      channel_id: 'C123',
      user_id: 'U123',
      command: '/investigate',
    };
    const first = expectEmit(await events.handleEvents(createContext(rawBody)));
    const second = expectEmit(await events.handleEvents(createContext(rawBody)));

    expect(first.httpResponse).toEqual({ status: 200 });
    expect(first.events[0]?.correlationKey).toEqual(expect.any(String));
    expect(first.events[0]?.correlationKey).not.toBe(second.events[0]?.correlationKey);
  });

  it('acks Slack url_verification without emitting', async () => {
    await expect(
      events.handleEvents(
        createContext({
          type: 'url_verification',
          token: 'slack-verification-token',
          challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        })
      )
    ).resolves.toEqual({
      type: 'http',
      httpResponse: {
        status: 200,
        body: { challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P' },
      },
    });
  });

  it.each([
    ['url verification without a challenge', { type: 'url_verification', token: 'ignored' }],
    ['url verification with an empty challenge', { type: 'url_verification', challenge: '' }],
    ['uncatalogued event', callback({ type: 'app_home_opened', user: 'U123' })],
    ['message without a channel', callback({ type: 'message', ts: '1.0', user: 'U123' })],
    ['non-object body', null],
    [
      'slash command without a workspace',
      { command: '/investigate', channel_id: 'C123', user_id: 'U123' },
    ],
    [
      'slash command without a leading slash',
      { command: 'investigate', team_id: 'T123', channel_id: 'C123', user_id: 'U123' },
    ],
    ['interactivity payload', { payload: '{"type":"block_actions"}' }],
  ])('does not emit for %s', async (_label, rawBody) => {
    await expect(events.handleEvents(createContext(rawBody))).resolves.toEqual({
      type: 'emit',
      events: [],
    });
  });

  it('assigns a distinct correlation key when Slack omits event_id', async () => {
    const rawBody = callback(
      { type: 'app_mention', channel: 'C123', ts: '1.0', user: 'U123', text: 'hi' },
      { event_id: undefined }
    );
    const first = expectEmit(await events.handleEvents(createContext(rawBody)));
    const second = expectEmit(await events.handleEvents(createContext(rawBody)));

    expect(first.events[0]?.correlationKey).toEqual(expect.any(String));
    expect(first.events[0]?.correlationKey).not.toBe(second.events[0]?.correlationKey);
  });
});
