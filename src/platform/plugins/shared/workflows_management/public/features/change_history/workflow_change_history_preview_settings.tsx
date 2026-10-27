/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCheckbox, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import { ChangeHistoryPreviewSettingsSection } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

const HIGHLIGHT_VALIDATION_ERRORS_LABEL = i18n.translate(
  'workflows.changeHistory.preview.settings.highlightValidationErrors',
  { defaultMessage: 'Highlight the validation errors' }
);

export interface WorkflowChangeHistoryPreviewSettingsProps {
  highlightValidationErrors: boolean;
  onHighlightValidationErrorsChange: (highlightValidationErrors: boolean) => void;
}

/** Workflow-specific settings shown below the shared compare mode setting. */
export const WorkflowChangeHistoryPreviewSettings = ({
  highlightValidationErrors,
  onHighlightValidationErrorsChange,
}: WorkflowChangeHistoryPreviewSettingsProps): JSX.Element => {
  const highlightValidationId = useGeneratedHtmlId({
    prefix: 'workflowChangeHistoryHighlightValidation',
  });

  return (
    <ChangeHistoryPreviewSettingsSection>
      <EuiCheckbox
        id={highlightValidationId}
        data-test-subj="workflowChangeHistoryHighlightValidationErrors"
        label={HIGHLIGHT_VALIDATION_ERRORS_LABEL}
        checked={highlightValidationErrors}
        onChange={(event) => onHighlightValidationErrorsChange(event.target.checked)}
      />
    </ChangeHistoryPreviewSettingsSection>
  );
};
