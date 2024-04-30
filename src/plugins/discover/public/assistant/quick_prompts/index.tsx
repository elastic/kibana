/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QuickPrompt } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import * as i18n1 from './translations';

/**
 * Global list of QuickPrompts intended to be used throughout Security Solution.
 * Useful if wanting to see all available QuickPrompts in one place, or if needing
 * to reference when constructing a new chat window to include a QuickPrompt.
 */
export const BASE_DISCOVER_QUICK_PROMPTS: QuickPrompt[] = [
  {
    title: i18n.translate('xpack.discover.assistant.quickPrompts.alertSummarizationTitle', {
      defaultMessage: 'Discover summarization',
    }),
    consumer: 'discover',
    prompt: i18n.translate('xpack.discover.assistant.quickPrompts.alertSummarizationTitle', {
      defaultMessage:
        'As an expert in logs analytics, provide a breakdown of the attached document and summarize what it might mean for my organization.',
    }),
    color: '#F68FBE',
    isDefault: true,
  },
  {
    title: i18n1.WORKFLOW_ANALYSIS_TITLE,
    prompt: i18n1.WORKFLOW_ANALYSIS_PROMPT,
    categories: ['TEST'],
    consumer: 'discover',
    color: '#36A2EF',
    isDefault: true,
  },
  {
    title: i18n1.SPL_QUERY_CONVERSION_TITLE,
    prompt: i18n1.SPL_QUERY_CONVERSION_PROMPT,
    consumer: 'discover',
    color: '#BADA55',
    isDefault: true,
  },
  {
    title: i18n1.AUTOMATION_TITLE,
    prompt: i18n1.AUTOMATION_PROMPT,
    consumer: 'discover',
    color: '#FFA500',
    isDefault: true,
  },
];
