/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod/v4';

const TEAMS_ID_MAX = 1024;

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

export const microsoftTeamsChannelMessage = {
  name: 'microsoft-teams.channel_message' as const,
  title: i18n.translate('connectorTopics.microsoftTeams.channelMessage.title', {
    defaultMessage: 'Channel message posted',
  }),
  description: i18n.translate('connectorTopics.microsoftTeams.channelMessage.description', {
    defaultMessage:
      'A message was posted in a Teams channel. The event includes the team, channel, and message ids. For a reply, message_id is the reply. Message content is not included.',
  }),
  eventSchema: ChannelMessageEventSchema,
};

export const microsoftTeamsChatMessage = {
  name: 'microsoft-teams.chat_message' as const,
  title: i18n.translate('connectorTopics.microsoftTeams.chatMessage.title', {
    defaultMessage: 'Chat message received',
  }),
  description: i18n.translate('connectorTopics.microsoftTeams.chatMessage.description', {
    defaultMessage:
      'A message was posted in a Teams chat. The event includes the chat and message ids. Message content is not included.',
  }),
  eventSchema: ChatMessageEventSchema,
};

export const microsoftTeamsChannelCreated = {
  name: 'microsoft-teams.channel_created' as const,
  title: i18n.translate('connectorTopics.microsoftTeams.channelCreated.title', {
    defaultMessage: 'Channel created',
  }),
  description: i18n.translate('connectorTopics.microsoftTeams.channelCreated.description', {
    defaultMessage: 'A channel was created in a team.',
  }),
  eventSchema: ChannelCreatedEventSchema,
};

export const microsoftTeamsChatCreated = {
  name: 'microsoft-teams.chat_created' as const,
  title: i18n.translate('connectorTopics.microsoftTeams.chatCreated.title', {
    defaultMessage: 'Chat created',
  }),
  description: i18n.translate('connectorTopics.microsoftTeams.chatCreated.description', {
    defaultMessage: 'A Teams chat was created.',
  }),
  eventSchema: ChatCreatedEventSchema,
};

export const microsoftTeamsTeamMemberAdded = {
  name: 'microsoft-teams.team_member_added' as const,
  title: i18n.translate('connectorTopics.microsoftTeams.teamMemberAdded.title', {
    defaultMessage: 'Team member added',
  }),
  description: i18n.translate('connectorTopics.microsoftTeams.teamMemberAdded.description', {
    defaultMessage: 'A user was added to a team.',
  }),
  eventSchema: TeamMemberAddedEventSchema,
};
