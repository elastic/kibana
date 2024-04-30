/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Prompt } from '@kbn/elastic-assistant';
import { SUPERHERO_SYSTEM_PROMPT_NAME, SUPERHERO_SYSTEM_PROMPT_NON_I18N } from './translations';

/**
 * Base System Prompts for Discover.
 */
export const BASE_DISCOVER_SYSTEM_PROMPTS: Prompt[] = [
  {
    id: 'CB9FA555-B59F-4F71-AFF9-1111111',
    content: SUPERHERO_SYSTEM_PROMPT_NON_I18N,
    name: SUPERHERO_SYSTEM_PROMPT_NAME,
    promptType: 'system',
    consumer: 'discover',
    isDefault: true,
  },
  {
    id: 'default-system-prompt-discover',
    content: 'You are a helpful, expert assistant who answers questions about Elastic Logs.',
    name: 'Discover default system prompt',
    promptType: 'system',
    isDefault: true,
    consumer: 'discover',
    isNewConversationDefault: true,
  },
];
