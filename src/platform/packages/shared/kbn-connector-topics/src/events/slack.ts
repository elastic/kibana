/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { ConnectorEventTopicDefinition } from './connector_event_topic';

export const SLACK_EVENT_ID_MAX = 128;
export const SLACK_EVENT_NAME_MAX = 256;
export const SLACK_EVENT_TEXT_MAX = 40_000;
export const SLACK_EVENT_EMAIL_MAX = 320;
export const SLACK_RESPONSE_URL_MAX = 2048;

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
      .describe(
        'Message text, when Slack includes it. Text from the message blocks and attachments that the message text does not already contain follows it, one line each.'
      ),
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

const SlackSlashCommandEventSchema = lazySchema(() =>
  z.object({
    workspace: slackId('Slack workspace (team) id.'),
    channel: slackId('Channel where the slash command was run.'),
    channelName: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe('Channel name, when Slack includes it.'),
    user: slackId('User id of the person who ran the command.'),
    userName: z
      .string()
      .min(1)
      .max(SLACK_EVENT_NAME_MAX)
      .optional()
      .describe('Username of the person who ran the command, when Slack includes it.'),
    command: z
      .string()
      .min(2)
      .max(SLACK_EVENT_NAME_MAX)
      .startsWith('/')
      .describe('Slash command, including the leading slash.'),
    text: z.string().max(SLACK_EVENT_TEXT_MAX).optional().describe('Text after the command.'),
    responseUrl: z
      .string()
      .max(SLACK_RESPONSE_URL_MAX)
      .startsWith('https://')
      .optional()
      .describe('Temporary Slack URL for a delayed reply to this command.'),
    apiAppId: optionalSlackId('Slack app id, when Slack includes it.'),
  })
);

const SlackMemberJoinedChannelEventSchema = lazySchema(() =>
  z.object({
    userId: slackId('User id of the person who joined the channel.'),
    channelId: slackId('Id of the channel that was joined.'),
    inviter: optionalSlackId('User id of the person who invited them, when Slack includes one.'),
  })
);

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

export const slack2Message = {
  name: 'slack2.message',
  eventSchema: SlackMessageEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2AppMention = {
  name: 'slack2.app_mention',
  eventSchema: SlackAppMentionEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2ReactionAdded = {
  name: 'slack2.reaction_added',
  eventSchema: SlackReactionAddedEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2FileShared = {
  name: 'slack2.file_shared',
  eventSchema: SlackFileSharedEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2FilePublic = {
  name: 'slack2.file_public',
  eventSchema: SlackFilePublicEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2ChannelCreated = {
  name: 'slack2.channel_created',
  eventSchema: SlackChannelCreatedEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2TeamJoin = {
  name: 'slack2.team_join',
  eventSchema: SlackTeamJoinEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2MemberJoinedChannel = {
  name: 'slack2.member_joined_channel',
  eventSchema: SlackMemberJoinedChannelEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

export const slack2SlashCommand = {
  name: 'slack2.slash_command',
  eventSchema: SlackSlashCommandEventSchema,
} as const satisfies ConnectorEventTopicDefinition;

/** Not a bus topic. The bridge resumes the paused workflow, and `spaceId` is the workflow space. */
export const slack2HitlAction = {
  name: 'slack2.hitl_action',
  eventSchema: SlackHitlActionEventSchema,
} as const satisfies ConnectorEventTopicDefinition;
