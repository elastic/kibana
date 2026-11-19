/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  eventSchema: ChannelMessageEventSchema,
};

export const microsoftTeamsChatMessage = {
  name: 'microsoft-teams.chat_message' as const,
  eventSchema: ChatMessageEventSchema,
};

export const microsoftTeamsChannelCreated = {
  name: 'microsoft-teams.channel_created' as const,
  eventSchema: ChannelCreatedEventSchema,
};

export const microsoftTeamsChatCreated = {
  name: 'microsoft-teams.chat_created' as const,
  eventSchema: ChatCreatedEventSchema,
};

export const microsoftTeamsTeamMemberAdded = {
  name: 'microsoft-teams.team_member_added' as const,
  eventSchema: TeamMemberAddedEventSchema,
};
