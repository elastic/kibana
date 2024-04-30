/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PromptContext, PromptContextTemplate } from '@kbn/elastic-assistant';
import * as i18n from './translations';
import * as i18nUserPrompts from '../prompts/user/translations';

export const PROMPT_CONTEXT_ALERT_CATEGORY = 'alert';
export const PROMPT_CONTEXT_EVENT_CATEGORY = 'event';
export const PROMPT_CONTEXT_DETECTION_RULES_CATEGORY = 'detection-rules';
export const DATA_QUALITY_DASHBOARD_CATEGORY = 'data-quality-dashboard';
export const KNOWLEDGE_BASE_CATEGORY = 'knowledge-base';

/**
 * Global list of PromptContexts intended to be used throughout Security Solution.
 * Useful if wanting to see all available PromptContexts in one place, or if needing
 * a unique set of categories to reference since the PromptContexts available on
 * useAssistantContext are dynamic (not globally registered).
 */
export const PROMPT_CONTEXTS: Record<PromptContext['category'], PromptContextTemplate> = {
  document: {
    category: 'document',
    consumer: 'discover',
    suggestedUserPrompt:
      'Explain the results above, and describe some options to fix incompatibilities.',
    description: 'Document',
    tooltip: 'Add this document as context',
  },
  [KNOWLEDGE_BASE_CATEGORY]: {
    category: KNOWLEDGE_BASE_CATEGORY,
    consumer: 'discover',
    suggestedUserPrompt:
      i18nUserPrompts.EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N,
    description: i18nUserPrompts.EVENT_SUMMARY_CONTEXT_DESCRIPTION(i18n.VIEW),
    tooltip: i18nUserPrompts.EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  },
};
