/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Conversation, Prompt, QuickPrompt } from '@kbn/elastic-assistant';
import { APP_ICON } from '../../../../common';
import {
  WELCOME_CONVERSATION_TITLE,
  WELCOME_GENERAL,
  WELCOME_GENERAL_2,
  WELCOME_GENERAL_3,
  ELASTIC_DISCOVER_ASSISTANT,
  EVENT_SUMMARY_CONVERSATION_ID,
  SUPERHERO_SYSTEM_PROMPT_NAME,
  SUPERHERO_SYSTEM_PROMPT_NON_I18N,
  DEFAULT_SYSTEM_PROMPT_NAME,
  DEFAULT_SYSTEM_PROMPT_NON_I18N,
  EVENT_SUMMARIZATION_TITLE,
  EVENT_SUMMARIZATION_PROMPT,
} from './translations';

export const BASE_DISCOVER_CONVERSATIONS: Record<string, Conversation> = {
  [EVENT_SUMMARY_CONVERSATION_ID]: {
    id: EVENT_SUMMARY_CONVERSATION_ID,
    isDefault: true,
    theme: {
      title: ELASTIC_DISCOVER_ASSISTANT,
      titleIcon: APP_ICON,
      assistant: {
        name: ELASTIC_DISCOVER_ASSISTANT,
        icon: APP_ICON,
      },
      system: {
        icon: 'logoElastic',
      },
      user: {},
    },
    messages: [],
    apiConfig: {},
  },
  [WELCOME_CONVERSATION_TITLE]: {
    id: WELCOME_CONVERSATION_TITLE,
    isDefault: true,
    theme: {
      title: ELASTIC_DISCOVER_ASSISTANT,
      titleIcon: APP_ICON,
      assistant: {
        name: ELASTIC_DISCOVER_ASSISTANT,
        icon: APP_ICON,
      },
      system: {
        icon: 'logoElastic',
      },
      user: {},
    },
    messages: [
      {
        role: 'assistant',
        content: WELCOME_GENERAL,
        timestamp: '',
        presentation: {
          delay: 2 * 1000,
          stream: true,
        },
      },
      {
        role: 'assistant',
        content: WELCOME_GENERAL_2,
        timestamp: '',
        presentation: {
          delay: 1000,
          stream: true,
        },
      },
      {
        role: 'assistant',
        content: WELCOME_GENERAL_3,
        timestamp: '',
        presentation: {
          delay: 1000,
          stream: true,
        },
      },
    ],
    apiConfig: {},
  },
};

/**
 * Base System Prompts for Elastic Discover Assistant
 */
export const BASE_SYSTEM_PROMPTS: Prompt[] = [
  {
    id: 'default-system-prompt',
    content: DEFAULT_SYSTEM_PROMPT_NON_I18N,
    name: DEFAULT_SYSTEM_PROMPT_NAME,
    promptType: 'system',
  },
  {
    id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
    content: SUPERHERO_SYSTEM_PROMPT_NON_I18N,
    name: SUPERHERO_SYSTEM_PROMPT_NAME,
    promptType: 'system',
  },
];

/**
 * Global list of QuickPrompts intended to be used throughout Discover.
 * Useful if wanting to see all available QuickPrompts in one place, or if needing
 * to reference when constructing a new chat window to include a QuickPrompt.
 */
export const PROMPT_CONTEXT_EVENT_CATEGORY = 'event';
export const BASE_DISCOVER_QUICK_PROMPTS: QuickPrompt[] = [
  {
    title: EVENT_SUMMARIZATION_TITLE,
    prompt: EVENT_SUMMARIZATION_PROMPT,
    color: '#F68FBE',
    categories: [PROMPT_CONTEXT_EVENT_CATEGORY],
    isDefault: true,
  },
];
