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
import React, { useEffect } from 'react';
import type { ChangeHistoryPreviewEditorContext } from '@kbn/change-history-ui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useWorkflowChangeHistoryPreviewValidation } from './use_workflow_change_history_preview_validation';
import {
  WORKFLOW_YAML_VALIDATION_ACCORDION_CLASS,
  WorkflowYamlValidationAccordion,
} from '../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion';
import { clearWorkflowYamlComputationCache } from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';

/** Space reserved for the fixed settings button (icon + right padding). */
const SETTINGS_RESERVE_PX = 48;

export interface WorkflowChangeHistoryPreviewValidationProps {
  context: ChangeHistoryPreviewEditorContext;
  highlightValidationErrors: boolean; // whether validation results are highlighted in the editor and listed in the footer
  validationYaml: string; // YAML validated in the preview
}

/** Runs workflow YAML validation against the shared preview editors and renders the results accordion in the footer. */
export const WorkflowChangeHistoryPreviewValidation = ({
  context,
  highlightValidationErrors,
  validationYaml,
}: WorkflowChangeHistoryPreviewValidationProps): JSX.Element | null => {
  const styles = useMemoCss(componentStyles);
  const { decorationsRef, isEditorMounted, ...editorContext } = context;
  const { validationResults, isValidationLoading, validationError, handleValidationErrorClick } =
    useWorkflowChangeHistoryPreviewValidation({
      ...editorContext,
      isEditorMounted,
      validationDecorationsRef: decorationsRef,
      highlightValidationErrors,
      validationYaml,
    });

  useEffect(() => () => clearWorkflowYamlComputationCache(), []);

  if (!highlightValidationErrors) {
    return null;
  }

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
        onErrorClick={handleValidationErrorClick}
      />
    </div>
  );
};

const componentStyles = {
  validationAccordion: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingRight: `calc(${euiTheme.size.m} + ${SETTINGS_RESERVE_PX}px)`,

      // Let the footer's subdued surface show through instead of the accordion's plain background.
      [`.${WORKFLOW_YAML_VALIDATION_ACCORDION_CLASS}`]: {
        backgroundColor: 'transparent',
      },
    }),
};
