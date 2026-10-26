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
  HandleEventsResult,
} from '../../connector_spec_events';
import { MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH } from '../../handle_events_result';
import {
  SLACK_APP_MENTION_EVENT_ID,
  SLACK_APP_MENTION_EVENT_KEY,
  SLACK_CHANNEL_CREATED_EVENT_ID,
  SLACK_CHANNEL_CREATED_EVENT_KEY,
  SLACK_FILE_PUBLIC_EVENT_ID,
  SLACK_FILE_PUBLIC_EVENT_KEY,
  SLACK_FILE_SHARED_EVENT_ID,
  SLACK_FILE_SHARED_EVENT_KEY,
  SLACK_HITL_ACTION_APPROVE,
  SLACK_HITL_ACTION_EVENT_ID,
  SLACK_HITL_ACTION_EVENT_KEY,
  SLACK_HITL_ACTION_REJECT,
  SLACK_HITL_ACTION_SUBMIT,
  SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID,
  SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY,
  SLACK_MESSAGE_EVENT_ID,
  SLACK_MESSAGE_EVENT_KEY,
  SLACK_REACTION_ADDED_EVENT_ID,
  SLACK_REACTION_ADDED_EVENT_KEY,
  SLACK_TEAM_JOIN_EVENT_ID,
  SLACK_TEAM_JOIN_EVENT_KEY,
} from './constants';

const SLACK_EVENT_ID_MAX = 128;
const SLACK_EVENT_NAME_MAX = 256;
const SLACK_EVENT_TEXT_MAX = 40_000;
const SLACK_EVENT_EMAIL_MAX = 320;
const SLACK_URL_VERIFICATION_CHALLENGE_MAX = 1024;

const slackId = (description: string) =>
  z.string().min(1).max(SLACK_EVENT_ID_MAX).describe(description);

const optionalSlackId = (description: string) => slackId(description).optional();

const SlackMessageEventSchema = lazySchema(() =>
  z.object({
    workspace: optionalSlackId('Slack workspace (team) id.'),
    channel: slackId('Channel where the message was posted.'),
    messageId: slackId('Message timestamp, which Slack uses as the message id.'),
    threadId: optionalSlackId('Thread timestamp when the message is in a thread.'),
    sender: optionalSlackId('User id of the sender, when Slack includes one.'),
    text: z
      .string()
      .max(SLACK_EVENT_TEXT_MAX)
      .optional()
      .describe('Message text, when Slack includes it.'),
    subtype: optionalSlackId('Slack message subtype, such as bot_message, when present.'),
    botId: optionalSlackId('Bot id when the message was sent by a bot.'),
    appId: optionalSlackId('Id of the Slack app that sent the message, when Slack includes it.'),
    botName: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe(
        'Display name of the bot or app that sent the message, when Slack includes it. The sender can set it, so use appId to identify the app.'
      ),
    externalConversationId: optionalSlackId(
      "The Relay's opaque key for the message's thread, when the Relay forwarded the event. A mention of the app in that thread carries the same key."
    ),
  })
);

const SlackAppMentionEventSchema = lazySchema(() =>
  z.object({
    workspace: optionalSlackId('Slack workspace (team) id.'),
    channel: slackId('Channel where the app was mentioned.'),
    messageId: slackId('Message timestamp of the mention.'),
    threadId: optionalSlackId('Thread timestamp when the mention is in a thread.'),
    sender: optionalSlackId('User id of the person who mentioned the app.'),
    text: z.string().max(SLACK_EVENT_TEXT_MAX).optional().describe('Text of the mention.'),
  })
);

const SlackReactionAddedEventSchema = lazySchema(() =>
  z.object({
    channel: optionalSlackId('Channel of the message that received the reaction.'),
    messageId: optionalSlackId('Timestamp of the message that received the reaction.'),
    fileId: optionalSlackId('Id of the file that received the reaction.'),
    fileCommentId: optionalSlackId('Id of the file comment that received the reaction.'),
    itemType: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe('Slack item type, such as message, file, or file_comment.'),
    user: slackId('User id of the person who added the reaction.'),
    reaction: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .describe('Reaction name, without colons.'),
  })
);

const SlackFileSharedEventSchema = lazySchema(() =>
  z.object({
    fileId: slackId('Id of the shared file.'),
    user: optionalSlackId('User id of the person who shared the file.'),
    channel: optionalSlackId('Channel the file was shared in, when Slack includes one.'),
  })
);

const SlackFilePublicEventSchema = lazySchema(() =>
  z.object({
    fileId: slackId('Id of the file that was made public.'),
    userId: optionalSlackId(
      'User id of the person who made the file public, when Slack includes it.'
    ),
  })
);

const SlackChannelCreatedEventSchema = lazySchema(() =>
  z.object({
    channelId: slackId('Id of the created public channel.'),
    name: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe('Name of the created channel.'),
    creator: optionalSlackId('User id of the person who created the channel.'),
  })
);

const SlackTeamJoinEventSchema = lazySchema(() =>
  z.object({
    userId: slackId('User id of the person who joined the workspace.'),
    name: z.string().min(1).max(SLACK_EVENT_NAME_MAX).optional().describe('Slack username.'),
    realName: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe('Profile real name, when Slack includes it.'),
    displayName: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe('Profile display name, when Slack includes it.'),
    email: z
      .string()
      .min(1)
      .max(SLACK_EVENT_EMAIL_MAX)
      .optional()
      .describe('Profile email, when Slack includes it.'),
  })
);

const SlackMemberJoinedChannelEventSchema = lazySchema(() =>
  z.object({
    userId: slackId('User id of the person who joined the channel.'),
    channelId: slackId('Id of the channel that was joined.'),
    inviter: optionalSlackId('User id of the person who invited them, when Slack includes one.'),
  })
);

const SLACK_RESPONSE_URL_MAX = 2048;

const SlackHitlActionEventSchema = lazySchema(() =>
  z.object({
    executionId: slackId('Workflow execution id from the HITL correlation payload.'),
    stepId: slackId('HITL step execution id from the correlation payload.'),
    token: z
      .string()
      .min(1)
      .max(128)
      .describe('External resume token from the correlation payload.'),
    spaceId: z.string().min(1).max(SLACK_EVENT_ID_MAX).describe('Kibana space id.'),
    kind: z
      .enum(['approval', 'input'])
      .describe('Which HITL wait step kind this interaction resumes.'),
    approved: z
      .boolean()
      .optional()
      .describe('Present for approval actions: true when Approve was clicked.'),
    inputJson: z
      .string()
      .max(SLACK_EVENT_TEXT_MAX)
      .optional()
      .describe(
        'JSON object string of waitForInput field values collected from Slack state.values.'
      ),
    responseUrl: z
      .string()
      .min(1)
      .max(SLACK_RESPONSE_URL_MAX)
      .optional()
      .describe('Slack response_url used to replace the interactive message after resume.'),
    slackUserId: optionalSlackId('Slack user id of the person who clicked the control.'),
  })
);

interface ParsedSlackEvent {
  readonly eventId: string;
  readonly payload: Record<string, unknown>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readBoundedString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    return undefined;
  }
  return value;
};

const readId = (value: unknown): string | undefined => readBoundedString(value, SLACK_EVENT_ID_MAX);

const readName = (value: unknown): string | undefined =>
  readBoundedString(value, SLACK_EVENT_NAME_MAX);

const readText = (value: unknown): string | undefined =>
  readBoundedString(value, SLACK_EVENT_TEXT_MAX);

const omitUndefined = (fields: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(fields).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );

const nestedRecord = (
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined => {
  const value = record[key];
  return isPlainObject(value) ? value : undefined;
};

const workspaceId = (
  envelope: Record<string, unknown>,
  event: Record<string, unknown>
): string | undefined => readId(envelope.team_id) ?? readId(event.team);

const readAppId = (source: Record<string, unknown>): string | undefined =>
  readId(source.app_id) ?? readId(nestedRecord(source, 'bot_profile')?.app_id);

// bot_profile.name, else the legacy username. https://docs.slack.dev/reference/events/message/bot_message
const readBotName = (source: Record<string, unknown>): string | undefined =>
  readName(nestedRecord(source, 'bot_profile')?.name) ?? readName(source.username);

const relayConversationKey = (envelope: Record<string, unknown>): string | undefined => {
  const relay = nestedRecord(envelope, 'relay');
  const origin = relay ? nestedRecord(relay, 'origin') : undefined;
  if (origin?.type !== 'slack') {
    return undefined;
  }
  return readId(origin.external_conversation_id);
};

const parseMessage = (
  event: Record<string, unknown>,
  workspace: string | undefined,
  externalConversationId: string | undefined
): ParsedSlackEvent | undefined => {
  const nested = nestedRecord(event, 'message');
  const previous = nestedRecord(event, 'previous_message');
  const subtype = readId(event.subtype);
  const nestedMessageId = nested ? readId(nested.ts) : undefined;
  const deletedMessageId = readId(event.deleted_ts) ?? (previous ? readId(previous.ts) : undefined);
  const messageId = (() => {
    if (subtype === 'message_deleted') {
      return deletedMessageId ?? readId(event.ts);
    }
    if (subtype === 'message_changed') {
      return nestedMessageId ?? readId(event.ts);
    }
    return readId(event.ts) ?? nestedMessageId;
  })();
  const channel = readId(event.channel);
  if (messageId === undefined || channel === undefined) {
    return undefined;
  }

  const deleted = subtype === 'message_deleted' ? previous : undefined;
  const sources = [event, nested, deleted].filter(
    (source): source is Record<string, unknown> => source !== undefined
  );
  const fromSources = (read: (source: Record<string, unknown>) => string | undefined) =>
    sources.map(read).find((value) => value !== undefined);

  return {
    eventId: SLACK_MESSAGE_EVENT_ID,
    payload: omitUndefined({
      workspace,
      channel,
      messageId,
      threadId: readId(event.thread_ts) ?? (nested ? readId(nested.thread_ts) : undefined),
      sender: fromSources((source) => readId(source.user)),
      text: fromSources((source) => readText(source.text)),
      subtype,
      botId: fromSources((source) => readId(source.bot_id)),
      appId: fromSources(readAppId),
      botName: fromSources(readBotName),
      externalConversationId,
    }),
  };
};

const parseAppMention = (
  event: Record<string, unknown>,
  workspace: string | undefined
): ParsedSlackEvent | undefined => {
  const channel = readId(event.channel);
  const messageId = readId(event.ts);
  if (channel === undefined || messageId === undefined) {
    return undefined;
  }

  return {
    eventId: SLACK_APP_MENTION_EVENT_ID,
    payload: omitUndefined({
      workspace,
      channel,
      messageId,
      threadId: readId(event.thread_ts),
      sender: readId(event.user),
      text: readText(event.text),
    }),
  };
};

const parseReactionAdded = (event: Record<string, unknown>): ParsedSlackEvent | undefined => {
  const user = readId(event.user);
  const reaction = readName(event.reaction);
  if (user === undefined || reaction === undefined) {
    return undefined;
  }

  const item = nestedRecord(event, 'item');
  return {
    eventId: SLACK_REACTION_ADDED_EVENT_ID,
    payload: omitUndefined({
      channel: item ? readId(item.channel) : undefined,
      messageId: item ? readId(item.ts) : undefined,
      fileId: item ? readId(item.file) : undefined,
      fileCommentId: item ? readId(item.file_comment) : undefined,
      itemType: item ? readName(item.type) : undefined,
      user,
      reaction,
    }),
  };
};

const fileIdFrom = (event: Record<string, unknown>): string | undefined => {
  const file = nestedRecord(event, 'file');
  return readId(event.file_id) ?? (file ? readId(file.id) : undefined);
};

const parseFileShared = (event: Record<string, unknown>): ParsedSlackEvent | undefined => {
  const fileId = fileIdFrom(event);
  if (fileId === undefined) {
    return undefined;
  }

  return {
    eventId: SLACK_FILE_SHARED_EVENT_ID,
    payload: omitUndefined({
      fileId,
      user: readId(event.user_id),
      channel: readId(event.channel_id),
    }),
  };
};

const parseFilePublic = (event: Record<string, unknown>): ParsedSlackEvent | undefined => {
  const fileId = fileIdFrom(event);
  if (fileId === undefined) {
    return undefined;
  }

  return {
    eventId: SLACK_FILE_PUBLIC_EVENT_ID,
    payload: omitUndefined({
      fileId,
      userId: readId(event.user_id),
    }),
  };
};

const parseChannelCreated = (event: Record<string, unknown>): ParsedSlackEvent | undefined => {
  const channel = nestedRecord(event, 'channel');
  const channelId = channel ? readId(channel.id) : undefined;
  if (channelId === undefined) {
    return undefined;
  }

  return {
    eventId: SLACK_CHANNEL_CREATED_EVENT_ID,
    payload: omitUndefined({
      channelId,
      name: channel ? readName(channel.name) : undefined,
      creator: channel ? readId(channel.creator) : undefined,
    }),
  };
};

const parseTeamJoin = (event: Record<string, unknown>): ParsedSlackEvent | undefined => {
  const user = event.user;
  if (typeof user === 'string') {
    const userId = readId(user);
    if (userId === undefined) {
      return undefined;
    }
    return { eventId: SLACK_TEAM_JOIN_EVENT_ID, payload: { userId } };
  }
  if (!isPlainObject(user)) {
    return undefined;
  }

  const userId = readId(user.id);
  if (userId === undefined) {
    return undefined;
  }

  const profile = nestedRecord(user, 'profile');
  return {
    eventId: SLACK_TEAM_JOIN_EVENT_ID,
    payload: omitUndefined({
      userId,
      name: readName(user.name),
      realName: readName(user.real_name) ?? (profile ? readName(profile.real_name) : undefined),
      displayName: profile ? readName(profile.display_name) : undefined,
      email: profile ? readBoundedString(profile.email, SLACK_EVENT_EMAIL_MAX) : undefined,
    }),
  };
};

const parseMemberJoinedChannel = (event: Record<string, unknown>): ParsedSlackEvent | undefined => {
  const userId = readId(event.user);
  const channelId = readId(event.channel);
  if (userId === undefined || channelId === undefined) {
    return undefined;
  }

  return {
    eventId: SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID,
    payload: omitUndefined({
      userId,
      channelId,
      inviter: readId(event.inviter),
    }),
  };
};

const parseSlackCallback = (
  envelope: Record<string, unknown>
): (ParsedSlackEvent & { readonly correlationKey: string }) | undefined => {
  if (envelope.type !== 'event_callback') {
    return undefined;
  }
  const event = envelope.event;
  if (!isPlainObject(event) || typeof event.type !== 'string') {
    return undefined;
  }

  const workspace = workspaceId(envelope, event);
  const parsed = (() => {
    if (event.type === 'message') {
      return parseMessage(event, workspace, relayConversationKey(envelope));
    }
    if (event.type === 'app_mention') {
      return parseAppMention(event, workspace);
    }
    if (event.type === 'reaction_added') {
      return parseReactionAdded(event);
    }
    if (event.type === 'file_shared') {
      return parseFileShared(event);
    }
    if (event.type === 'file_public') {
      return parseFilePublic(event);
    }
    if (event.type === 'channel_created') {
      return parseChannelCreated(event);
    }
    if (event.type === 'team_join') {
      return parseTeamJoin(event);
    }
    if (event.type === 'member_joined_channel') {
      return parseMemberJoinedChannel(event);
    }
    return undefined;
  })();

  if (parsed === undefined) {
    return undefined;
  }

  const eventId = readBoundedString(envelope.event_id, MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH);
  return {
    ...parsed,
    correlationKey: eventId ?? uuidv4(),
  };
};

/**
 * Slack Request URL check: `{ type: "url_verification", challenge }`.
 */
const getUrlVerificationChallenge = (rawBody: Record<string, unknown>): string | undefined => {
  if (rawBody.type !== 'url_verification') {
    return undefined;
  }
  const { challenge } = rawBody;
  if (typeof challenge !== 'string' || challenge.length === 0) {
    return undefined;
  }
  if (challenge.length > SLACK_URL_VERIFICATION_CHALLENGE_MAX) {
    return undefined;
  }
  return challenge;
};

const HITL_CORRELATION_VALUE_MAX = 2000;

const decodeHitlCorrelation = (
  value: string
):
  | {
      executionId: string;
      stepId: string;
      token: string;
      spaceId: string;
      kind: 'approval' | 'input';
    }
  | undefined => {
  if (value.length === 0 || value.length > HITL_CORRELATION_VALUE_MAX) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!isPlainObject(parsed) || parsed.v !== 1) {
    return undefined;
  }
  const executionId = readId(parsed.e);
  const stepId = readId(parsed.s);
  const token = readBoundedString(parsed.t, 128);
  const spaceId = readBoundedString(parsed.p, SLACK_EVENT_ID_MAX);
  if (!executionId || !stepId || !token || !spaceId) {
    return undefined;
  }
  if (parsed.k !== 'a' && parsed.k !== 'i') {
    return undefined;
  }
  return {
    executionId,
    stepId,
    token,
    spaceId,
    kind: parsed.k === 'a' ? 'approval' : 'input',
  };
};

const mapSlackStateValuesToInputJson = (stateValues: unknown): string | undefined => {
  if (!isPlainObject(stateValues)) {
    return undefined;
  }
  const input: Record<string, string | number | boolean | string[]> = {};
  for (const block of Object.values(stateValues)) {
    if (!isPlainObject(block)) {
      continue;
    }
    for (const [actionId, rawField] of Object.entries(block)) {
      if (!isPlainObject(rawField)) {
        continue;
      }
      const type = typeof rawField.type === 'string' ? rawField.type : undefined;
      if (type === 'plain_text_input' || type === 'email_text_input' || type === 'url_text_input') {
        if (typeof rawField.value === 'string') {
          input[actionId] = rawField.value;
        }
        continue;
      }
      if (type === 'number_input' && typeof rawField.value === 'string' && rawField.value.length) {
        const asNumber = Number(rawField.value);
        input[actionId] = Number.isFinite(asNumber) ? asNumber : rawField.value;
        continue;
      }
      if (type === 'multi_static_select' && Array.isArray(rawField.selected_options)) {
        const values = rawField.selected_options.flatMap((option) => {
          if (!isPlainObject(option) || typeof option.value !== 'string') {
            return [];
          }
          return [option.value];
        });
        if (values.length > 0) {
          input[actionId] = values;
        }
        continue;
      }
      if (type === 'static_select' || type === 'radio_buttons') {
        const selected = isPlainObject(rawField.selected_option)
          ? rawField.selected_option
          : undefined;
        if (selected && typeof selected.value === 'string') {
          if (
            type === 'radio_buttons' &&
            (selected.value === 'true' || selected.value === 'false')
          ) {
            input[actionId] = selected.value === 'true';
          } else {
            input[actionId] = selected.value;
          }
        }
      }
    }
  }
  return JSON.stringify(input);
};

/**
 * Interactivity payloads are often form-urlencoded as `{ payload: "<json>" }`.
 */
const resolveInteractivityEnvelope = (
  rawBody: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (typeof rawBody.payload === 'string') {
    try {
      const parsed = JSON.parse(rawBody.payload);
      return isPlainObject(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  if (rawBody.type === 'block_actions') {
    return rawBody;
  }
  return undefined;
};

const parseHitlBlockActions = (
  envelope: Record<string, unknown>
): (ParsedSlackEvent & { correlationKey: string }) | undefined => {
  if (envelope.type !== 'block_actions' || !Array.isArray(envelope.actions)) {
    return undefined;
  }
  const action = envelope.actions[0];
  if (!isPlainObject(action) || typeof action.action_id !== 'string') {
    return undefined;
  }
  const { action_id: actionId } = action;
  if (
    actionId !== SLACK_HITL_ACTION_APPROVE &&
    actionId !== SLACK_HITL_ACTION_REJECT &&
    actionId !== SLACK_HITL_ACTION_SUBMIT
  ) {
    return undefined;
  }
  if (typeof action.value !== 'string') {
    return undefined;
  }
  const correlation = decodeHitlCorrelation(action.value);
  if (!correlation) {
    return undefined;
  }

  const responseUrl = readBoundedString(envelope.response_url, SLACK_RESPONSE_URL_MAX);
  const user = isPlainObject(envelope.user) ? envelope.user : undefined;
  const slackUserId = user ? readId(user.id) : undefined;
  const responseFields = {
    ...(responseUrl ? { responseUrl } : {}),
    ...(slackUserId ? { slackUserId } : {}),
  };

  if (actionId === SLACK_HITL_ACTION_APPROVE || actionId === SLACK_HITL_ACTION_REJECT) {
    if (correlation.kind !== 'approval') {
      return undefined;
    }
    return {
      eventId: SLACK_HITL_ACTION_EVENT_ID,
      correlationKey: uuidv4(),
      payload: {
        executionId: correlation.executionId,
        stepId: correlation.stepId,
        token: correlation.token,
        spaceId: correlation.spaceId,
        kind: 'approval',
        approved: actionId === SLACK_HITL_ACTION_APPROVE,
        ...responseFields,
      },
    };
  }

  if (correlation.kind !== 'input') {
    return undefined;
  }
  const state = isPlainObject(envelope.state) ? envelope.state.values : undefined;
  return {
    eventId: SLACK_HITL_ACTION_EVENT_ID,
    correlationKey: uuidv4(),
    payload: {
      executionId: correlation.executionId,
      stepId: correlation.stepId,
      token: correlation.token,
      spaceId: correlation.spaceId,
      kind: 'input',
      inputJson: mapSlackStateValuesToInputJson(state) ?? '{}',
      ...responseFields,
    },
  };
};

const handleSlackEvents = async (ctx: ConnectorIngressContext): Promise<HandleEventsResult> => {
  if (!isPlainObject(ctx.rawBody)) {
    return { type: 'emit', events: [] };
  }

  const challenge = getUrlVerificationChallenge(ctx.rawBody);
  if (challenge !== undefined) {
    return {
      type: 'http',
      httpResponse: {
        status: 200,
        body: { challenge },
      },
    };
  }

  const interactivityEnvelope = resolveInteractivityEnvelope(ctx.rawBody);
  if (interactivityEnvelope) {
    const hitl = parseHitlBlockActions(interactivityEnvelope);
    if (hitl) {
      return {
        type: 'emit',
        events: [
          {
            eventId: hitl.eventId,
            correlationKey: hitl.correlationKey,
            payload: hitl.payload,
          },
        ],
      };
    }
    // Non-HITL interactivity is ignored (no workflow start).
    return { type: 'emit', events: [] };
  }

  const parsed = parseSlackCallback(ctx.rawBody);
  if (parsed === undefined) {
    return { type: 'emit', events: [] };
  }

  return {
    type: 'emit',
    events: [
      {
        eventId: parsed.eventId,
        correlationKey: parsed.correlationKey,
        payload: parsed.payload,
      },
    ],
  };
};

export const slackEvents: ConnectorSpecEvents = {
  definitions: {
    [SLACK_MESSAGE_EVENT_KEY]: {
      eventId: SLACK_MESSAGE_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.message.title', {
        defaultMessage: 'Message posted',
      }),
      description: i18n.translate('connectorSpecs.slack.events.message.description', {
        defaultMessage:
          'A message was posted in Slack. Subtype and bot or app identity are included when Slack sends them.',
      }),
      eventSchema: SlackMessageEventSchema,
    },
    [SLACK_APP_MENTION_EVENT_KEY]: {
      eventId: SLACK_APP_MENTION_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.appMention.title', {
        defaultMessage: 'App mentioned',
      }),
      description: i18n.translate('connectorSpecs.slack.events.appMention.description', {
        defaultMessage: 'The Slack app was mentioned in a channel.',
      }),
      eventSchema: SlackAppMentionEventSchema,
    },
    [SLACK_REACTION_ADDED_EVENT_KEY]: {
      eventId: SLACK_REACTION_ADDED_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.reactionAdded.title', {
        defaultMessage: 'Reaction added',
      }),
      description: i18n.translate('connectorSpecs.slack.events.reactionAdded.description', {
        defaultMessage: 'A reaction was added to a Slack message.',
      }),
      eventSchema: SlackReactionAddedEventSchema,
    },
    [SLACK_FILE_SHARED_EVENT_KEY]: {
      eventId: SLACK_FILE_SHARED_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.fileShared.title', {
        defaultMessage: 'File shared',
      }),
      description: i18n.translate('connectorSpecs.slack.events.fileShared.description', {
        defaultMessage: 'A file was shared in Slack.',
      }),
      eventSchema: SlackFileSharedEventSchema,
    },
    [SLACK_FILE_PUBLIC_EVENT_KEY]: {
      eventId: SLACK_FILE_PUBLIC_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.filePublic.title', {
        defaultMessage: 'File made public',
      }),
      description: i18n.translate('connectorSpecs.slack.events.filePublic.description', {
        defaultMessage: 'A Slack file was made public.',
      }),
      eventSchema: SlackFilePublicEventSchema,
    },
    [SLACK_CHANNEL_CREATED_EVENT_KEY]: {
      eventId: SLACK_CHANNEL_CREATED_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.channelCreated.title', {
        defaultMessage: 'Public channel created',
      }),
      description: i18n.translate('connectorSpecs.slack.events.channelCreated.description', {
        defaultMessage: 'A public Slack channel was created.',
      }),
      eventSchema: SlackChannelCreatedEventSchema,
    },
    [SLACK_TEAM_JOIN_EVENT_KEY]: {
      eventId: SLACK_TEAM_JOIN_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.teamJoin.title', {
        defaultMessage: 'User joined workspace',
      }),
      description: i18n.translate('connectorSpecs.slack.events.teamJoin.description', {
        defaultMessage: 'A user joined the Slack workspace.',
      }),
      eventSchema: SlackTeamJoinEventSchema,
    },
    [SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY]: {
      eventId: SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID,
      title: i18n.translate('connectorSpecs.slack.events.memberJoinedChannel.title', {
        defaultMessage: 'User joined channel',
      }),
      description: i18n.translate('connectorSpecs.slack.events.memberJoinedChannel.description', {
        defaultMessage: 'A user joined a Slack channel.',
      }),
      eventSchema: SlackMemberJoinedChannelEventSchema,
    },
    [SLACK_HITL_ACTION_EVENT_KEY]: {
      eventId: SLACK_HITL_ACTION_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.hitlAction.title', {
        defaultMessage: 'Workflow HITL action',
      }),
      description: i18n.translate('core.kibanaConnectorSpecs.slack.events.hitlAction.description', {
        defaultMessage:
          'A human-in-the-loop Approve, Decline, or Submit control was used in Slack. Resumes a paused workflow; not intended as a workflow start trigger.',
      }),
      eventSchema: SlackHitlActionEventSchema,
    },
  },
  handleEvents: handleSlackEvents,
};
