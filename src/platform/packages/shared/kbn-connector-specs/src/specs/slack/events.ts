/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
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

const SlackMessageEventSchema = z.object({
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
});

const SlackAppMentionEventSchema = z.object({
  workspace: optionalSlackId('Slack workspace (team) id.'),
  channel: slackId('Channel where the app was mentioned.'),
  messageId: slackId('Message timestamp of the mention.'),
  threadId: optionalSlackId('Thread timestamp when the mention is in a thread.'),
  sender: optionalSlackId('User id of the person who mentioned the app.'),
  text: z.string().max(SLACK_EVENT_TEXT_MAX).optional().describe('Text of the mention.'),
});

const SlackReactionAddedEventSchema = z.object({
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
  reaction: z.string().min(1).max(SLACK_EVENT_NAME_MAX).describe('Reaction name, without colons.'),
});

const SlackFileSharedEventSchema = z.object({
  fileId: slackId('Id of the shared file.'),
  user: optionalSlackId('User id of the person who shared the file.'),
  channel: optionalSlackId('Channel the file was shared in, when Slack includes one.'),
});

const SlackFilePublicEventSchema = z.object({
  fileId: slackId('Id of the file that was made public.'),
  userId: optionalSlackId(
    'User id of the person who made the file public, when Slack includes it.'
  ),
});

const SlackChannelCreatedEventSchema = z.object({
  channelId: slackId('Id of the created public channel.'),
  name: z
    .string()
    .min(1)
    .max(SLACK_EVENT_NAME_MAX)
    .optional()
    .describe('Name of the created channel.'),
  creator: optionalSlackId('User id of the person who created the channel.'),
});

const SlackTeamJoinEventSchema = z.object({
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
});

const SlackMemberJoinedChannelEventSchema = z.object({
  userId: slackId('User id of the person who joined the channel.'),
  channelId: slackId('Id of the channel that was joined.'),
  inviter: optionalSlackId('User id of the person who invited them, when Slack includes one.'),
});

interface ParsedSlackEvent {
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

const parseMessage = (
  event: Record<string, unknown>,
  workspace: string | undefined
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
  return {
    eventId: SLACK_MESSAGE_EVENT_ID,
    payload: omitUndefined({
      workspace,
      channel,
      messageId,
      threadId: readId(event.thread_ts) ?? (nested ? readId(nested.thread_ts) : undefined),
      sender:
        readId(event.user) ??
        (nested ? readId(nested.user) : undefined) ??
        (deleted ? readId(deleted.user) : undefined),
      text:
        readText(event.text) ??
        (nested ? readText(nested.text) : undefined) ??
        (deleted ? readText(deleted.text) : undefined),
      subtype,
      botId: readId(event.bot_id) ?? (nested ? readId(nested.bot_id) : undefined),
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
      return parseMessage(event, workspace);
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
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.message.title', {
        defaultMessage: 'Message posted',
      }),
      description: i18n.translate('core.kibanaConnectorSpecs.slack.events.message.description', {
        defaultMessage:
          'A message was posted in Slack. Subtype and bot identity are included when Slack sends them.',
      }),
      eventSchema: SlackMessageEventSchema,
    },
    [SLACK_APP_MENTION_EVENT_KEY]: {
      eventId: SLACK_APP_MENTION_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.appMention.title', {
        defaultMessage: 'App mentioned',
      }),
      description: i18n.translate('core.kibanaConnectorSpecs.slack.events.appMention.description', {
        defaultMessage: 'The Slack app was mentioned in a channel.',
      }),
      eventSchema: SlackAppMentionEventSchema,
    },
    [SLACK_REACTION_ADDED_EVENT_KEY]: {
      eventId: SLACK_REACTION_ADDED_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.reactionAdded.title', {
        defaultMessage: 'Reaction added',
      }),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.events.reactionAdded.description',
        {
          defaultMessage: 'A reaction was added to a Slack message.',
        }
      ),
      eventSchema: SlackReactionAddedEventSchema,
    },
    [SLACK_FILE_SHARED_EVENT_KEY]: {
      eventId: SLACK_FILE_SHARED_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.fileShared.title', {
        defaultMessage: 'File shared',
      }),
      description: i18n.translate('core.kibanaConnectorSpecs.slack.events.fileShared.description', {
        defaultMessage: 'A file was shared in Slack.',
      }),
      eventSchema: SlackFileSharedEventSchema,
    },
    [SLACK_FILE_PUBLIC_EVENT_KEY]: {
      eventId: SLACK_FILE_PUBLIC_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.filePublic.title', {
        defaultMessage: 'File made public',
      }),
      description: i18n.translate('core.kibanaConnectorSpecs.slack.events.filePublic.description', {
        defaultMessage: 'A Slack file was made public.',
      }),
      eventSchema: SlackFilePublicEventSchema,
    },
    [SLACK_CHANNEL_CREATED_EVENT_KEY]: {
      eventId: SLACK_CHANNEL_CREATED_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.channelCreated.title', {
        defaultMessage: 'Public channel created',
      }),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.events.channelCreated.description',
        {
          defaultMessage: 'A public Slack channel was created.',
        }
      ),
      eventSchema: SlackChannelCreatedEventSchema,
    },
    [SLACK_TEAM_JOIN_EVENT_KEY]: {
      eventId: SLACK_TEAM_JOIN_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.teamJoin.title', {
        defaultMessage: 'User joined workspace',
      }),
      description: i18n.translate('core.kibanaConnectorSpecs.slack.events.teamJoin.description', {
        defaultMessage: 'A user joined the Slack workspace.',
      }),
      eventSchema: SlackTeamJoinEventSchema,
    },
    [SLACK_MEMBER_JOINED_CHANNEL_EVENT_KEY]: {
      eventId: SLACK_MEMBER_JOINED_CHANNEL_EVENT_ID,
      title: i18n.translate('core.kibanaConnectorSpecs.slack.events.memberJoinedChannel.title', {
        defaultMessage: 'User joined channel',
      }),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.slack.events.memberJoinedChannel.description',
        {
          defaultMessage: 'A user joined a Slack channel.',
        }
      ),
      eventSchema: SlackMemberJoinedChannelEventSchema,
    },
  },
  handleEvents: handleSlackEvents,
};
