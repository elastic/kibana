/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const BACK_TO_WORKFLOW = i18n.translate('workflows.changeHistory.backToWorkflow', {
  defaultMessage: 'Back to workflow',
});

export const CURRENT_VERSION_ONLY_BADGE = i18n.translate(
  'workflows.changeHistory.currentVersionOnlyBadge',
  {
    defaultMessage: 'Current version',
  }
);

export const VERSION_BADGE = (version: number): string =>
  i18n.translate('workflows.changeHistory.versionBadge', {
    defaultMessage: 'v{version}',
    values: { version },
  });

export const VERSION_BADGE_FALLBACK = i18n.translate(
  'workflows.changeHistory.versionBadgeFallback',
  {
    defaultMessage: 'Selected version',
  }
);

export const COMPARING_WITH_LABEL = i18n.translate('workflows.changeHistory.comparingWithLabel', {
  defaultMessage: 'Comparing with:',
});

export const PREVIOUS_VERSION_LABEL = i18n.translate(
  'workflows.changeHistory.previousVersionLabel',
  {
    defaultMessage: 'Previous version:',
  }
);

export const SELECTED_VERSION_LABEL = i18n.translate(
  'workflows.changeHistory.selectedVersionLabel',
  {
    defaultMessage: 'Selected version:',
  }
);

export const UNSAVED_CHANGES_ACTION = i18n.translate(
  'workflows.changeHistory.unsavedChangesAction',
  {
    defaultMessage: 'Unsaved changes',
  }
);

export const UNSAVED_CHANGES_ACTOR = i18n.translate('workflows.changeHistory.unsavedChangesActor', {
  defaultMessage: 'You',
});

export const CHANGES_SUMMARY_STEPS = i18n.translate(
  'workflows.changeHistory.changesSummary.steps',
  {
    defaultMessage: 'Steps:',
  }
);

export const CHANGES_SUMMARY_TRIGGERS = i18n.translate(
  'workflows.changeHistory.changesSummary.triggers',
  {
    defaultMessage: 'Triggers:',
  }
);

export const CHANGES_SUMMARY_SETTINGS = i18n.translate(
  'workflows.changeHistory.changesSummary.settings',
  {
    defaultMessage: 'Settings:',
  }
);

export const CHANGES_ADDED = (count: number): string =>
  i18n.translate('workflows.changeHistory.changesSummary.added', {
    defaultMessage: '{count} added',
    values: { count },
  });

export const CHANGES_REMOVED = (count: number): string =>
  i18n.translate('workflows.changeHistory.changesSummary.removed', {
    defaultMessage: '{count} removed',
    values: { count },
  });

export const CHANGES_UPDATED = (count: number): string =>
  i18n.translate('workflows.changeHistory.changesSummary.updated', {
    defaultMessage: '{count} updated',
    values: { count },
  });
