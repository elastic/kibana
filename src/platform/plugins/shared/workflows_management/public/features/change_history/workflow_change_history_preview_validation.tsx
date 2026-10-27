/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { ChangeHistoryPreviewEditorContext } from '@kbn/change-history-ui';
import { ChangeHistoryPreviewFooterSpacer } from '@kbn/change-history-ui';
import { useWorkflowChangeHistoryPreviewValidation } from './use_workflow_change_history_preview_validation';
import { WorkflowChangeHistoryPreviewFooter } from './workflow_change_history_preview_footer';
import { clearWorkflowYamlComputationCache } from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';

export interface WorkflowChangeHistoryPreviewValidationProps {
  context: ChangeHistoryPreviewEditorContext;
  /** Whether validation results are highlighted in the editor and listed in the footer. */
  highlightValidationErrors: boolean;
  /** YAML validated in the preview. */
  validationYaml: string;
}

/** Runs workflow YAML validation against the shared preview editors and renders the results footer. */
export const WorkflowChangeHistoryPreviewValidation = ({
  context,
  highlightValidationErrors,
  validationYaml,
}: WorkflowChangeHistoryPreviewValidationProps): JSX.Element => {
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
    return <ChangeHistoryPreviewFooterSpacer />;
  }

  return (
    <WorkflowChangeHistoryPreviewFooter
      validationResults={validationResults}
      isEditorMounted={isEditorMounted}
      isValidationLoading={isValidationLoading}
      validationError={validationError}
      onValidationErrorClick={handleValidationErrorClick}
    />
  );
};
