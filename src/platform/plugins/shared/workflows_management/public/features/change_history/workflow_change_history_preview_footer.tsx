/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { WorkflowYamlValidationAccordion } from '../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion';

/** Space reserved for the fixed settings button (icon + right padding). */
export const WORKFLOW_CHANGE_HISTORY_PREVIEW_SETTINGS_RESERVE_PX = 48;

export interface WorkflowChangeHistoryPreviewFooterProps {
  validationResults: YamlValidationResult[];
  isEditorMounted: boolean;
  isValidationLoading: boolean;
  validationError: Error | null;
  onValidationErrorClick?: (error: YamlValidationResult) => void;
}

/** Validation results accordion shown in the shared preview footer when highlighting is enabled. */
export const WorkflowChangeHistoryPreviewFooter = ({
  validationResults,
  isEditorMounted,
  isValidationLoading,
  validationError,
  onValidationErrorClick,
}: WorkflowChangeHistoryPreviewFooterProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);

  return (
    <div
      css={styles.validationAccordion}
      data-test-subj="workflowChangeHistoryPreviewValidationAccordion"
    >
      <WorkflowYamlValidationAccordion
        isMounted={isEditorMounted}
        isLoading={isValidationLoading}
        error={validationError}
        validationErrors={isValidationLoading ? null : validationResults}
        onErrorClick={onValidationErrorClick}
      />
    </div>
  );
};

const componentStyles = {
  validationAccordion: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingRight: `calc(${euiTheme.size.m} + ${WORKFLOW_CHANGE_HISTORY_PREVIEW_SETTINGS_RESERVE_PX}px)`,
    }),
};
