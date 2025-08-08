/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingName',
  {
    defaultMessage: 'AI Assistant visibility',
  }
);

export const ONLY_IN_THEIR_SOLUTIONS = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueDefault',
  { defaultMessage: 'Only in their solutions' }
);
export const OBSERVABILITY_IN_OTHER_APPS = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueObservability',
  { defaultMessage: 'Observability and Search AI Assistants in other apps' }
);
export const SECURITY_IN_OTHER_APPS = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueSecurity',
  { defaultMessage: 'Security AI Assistant in other apps' }
);
export const HIDE_ALL_ASSISTANTS = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueNever',
  { defaultMessage: 'Hide all assistants' }
);

export const SHOW_SECURITY = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueNever',
  { defaultMessage: 'Show Security AI Assistant' }
);

export const SHOW_OBSERVABILITY = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueNever',
  { defaultMessage: 'Show Observability AI Assistant' }
);

export const HIDE_ASSISTANT = i18n.translate(
  'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueNever',
  { defaultMessage: 'Hide AI Assistant' }
);
