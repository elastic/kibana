/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_WORKFLOWS = i18n.translate(
  'xpack.workflowsManagement.workflowsList.searchAriaLabel',
  {
    defaultMessage: 'Search workflows',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'plugins.workflowsManagement.workflowsList.searchPlaceholder',
  {
    defaultMessage: 'Workflow name/description',
  }
);

export const MANUAL_TRIGGERS_DESCRIPTIONS: Record<string, string> = {
  manual: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.manualTriggerDescription',
    {
      defaultMessage:
        'Provide custom JSON data manually for testing. Ideal for simulating specific scenarios or debugging edge cases.',
    }
  ),
  index: i18n.translate('plugins.workflowsManagement.workflowsExecution.indexTriggerDescription', {
    defaultMessage:
      'Choose a document directly from an index to use as the test input. This is helpful for verifying workflows against real indexed data.',
  }),
  alert: i18n.translate('plugins.workflowsManagement.workflowsExecution.alertTriggerDescription', {
    defaultMessage:
      'Choose an existing alert directly from an index to use as the test input. This is helpful for verifying workflows against real alerts data.',
  }),
  scheduled: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.scheduledTriggerDescription',
    {
      defaultMessage: 'Select a schedule to trigger workflow',
    }
  ),
};

export const TRIGGERS_LIST_TITLE = i18n.translate(
  'plugins.workflowsManagement.workflowsList.triggersListTitle',
  {
    defaultMessage: 'Triggers',
  }
);

export const TAGS_LIST_TITLE = i18n.translate(
  'plugins.workflowsManagement.workflowsList.tagsListTitle',
  {
    defaultMessage: 'Tags',
  }
);
