/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKSPACE_TOOL_PROFILE = 'profile';
export const WORKSPACE_TOOL_RECENT = 'recent';
export const WORKSPACE_TOOL_FEEDBACK = 'feedback';
export const WORKSPACE_TOOL_NEWSFEED = 'newsfeed';
export const WORKSPACE_TOOL_HELP = 'help';
export const WORKSPACE_TOOL_AI_ASSISTANT = 'aiAssistant';

export const WORKSPACE_KNOWN_TOOLS = [
  WORKSPACE_TOOL_PROFILE,
  WORKSPACE_TOOL_RECENT,
  WORKSPACE_TOOL_NEWSFEED,
  WORKSPACE_TOOL_FEEDBACK,
  WORKSPACE_TOOL_HELP,
  WORKSPACE_TOOL_AI_ASSISTANT,
] as const;
