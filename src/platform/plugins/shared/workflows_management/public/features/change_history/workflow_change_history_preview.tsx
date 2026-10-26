/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import {
  ChangeHistoryPreview,
  ChangeHistoryPreviewFooterSpacer,
  getChangeHistoryValidationDisplayOptions,
} from '@kbn/change-history-ui';
import { getWorkflowChangeHistoryCompareIndicator } from './get_workflow_change_history_compare_indicator';
import { getWorkflowYamlFromSnapshot } from './get_workflow_yaml_from_snapshot';
import { WorkflowChangeHistoryPreviewSettings } from './workflow_change_history_preview_settings';
import { WorkflowChangeHistoryPreviewValidation } from './workflow_change_history_preview_validation';

const getYamlFromChange = (change: Parameters<ChangeHistoryPreviewRenderFn>[0]['change']): string =>
  getWorkflowYamlFromSnapshot(change.snapshot);

const highlightStyle = (euiTheme: UseEuiTheme['euiTheme']) => ({
  backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
  borderRadius: '2px',
});

/** Styles for the validation decoration classes applied by the workflow YAML validation. */
const validationDecorationStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    '.template-variable-error': {
      ...highlightStyle(euiTheme),
      color: euiTheme.colors.severity.danger,
    },
    '.template-variable-warning': highlightStyle(euiTheme),
    '.liquid-template-error': {
      ...highlightStyle(euiTheme),
      color: euiTheme.colors.severity.danger,
    },
    '.liquid-template-warning': highlightStyle(euiTheme),
    '.duplicate-step-name-error': {
      backgroundColor: euiTheme.colors.backgroundLightDanger,
    },
    '.yaml-error': highlightStyle(euiTheme),
    '.yaml-warning': highlightStyle(euiTheme),
  });

interface WorkflowChangeHistoryPreviewProps {
  baselineYaml?: string;
  targetYaml: string;
  compareIndicator?: ReturnType<typeof getWorkflowChangeHistoryCompareIndicator>;
  diffTelemetry?: Parameters<ChangeHistoryPreviewRenderFn>[0]['diffTelemetry'];
}

const WorkflowChangeHistoryPreview = ({
  baselineYaml,
  targetYaml,
  compareIndicator,
  diffTelemetry,
}: WorkflowChangeHistoryPreviewProps): JSX.Element => {
  const [highlightValidationErrors, setHighlightValidationErrors] = useState(false);
  // Read-only editors hide validation squiggles and hovers unless explicitly enabled.
  const editorOptions = useMemo(
    () => getChangeHistoryValidationDisplayOptions(highlightValidationErrors),
    [highlightValidationErrors]
  );

  return (
    <ChangeHistoryPreview
      baseline={baselineYaml}
      target={targetYaml}
      language="yaml"
      diffTelemetry={diffTelemetry}
      compareIndicator={compareIndicator}
      containerStyles={validationDecorationStyles}
      editorOptions={editorOptions}
      extraSettings={
        <WorkflowChangeHistoryPreviewSettings
          highlightValidationErrors={highlightValidationErrors}
          onHighlightValidationErrorsChange={setHighlightValidationErrors}
        />
      }
      renderFooter={(context) =>
        context ? (
          <WorkflowChangeHistoryPreviewValidation
            context={context}
            highlightValidationErrors={highlightValidationErrors}
            validationYaml={targetYaml}
          />
        ) : (
          <ChangeHistoryPreviewFooterSpacer />
        )
      }
      data-test-subj="workflowChangeHistoryMonacoPreview"
    />
  );
};

export const renderWorkflowChangeHistoryPreview: ChangeHistoryPreviewRenderFn = ({
  change,
  compareSpec,
  isLoadingCompareContext,
  diffTelemetry,
}) => {
  if (!compareSpec) {
    return <WorkflowChangeHistoryPreview targetYaml={getYamlFromChange(change)} />;
  }

  const baselineYaml = getYamlFromChange(compareSpec.baseline);
  const targetYaml = getYamlFromChange(compareSpec.target);

  if (isLoadingCompareContext) {
    return <WorkflowChangeHistoryPreview targetYaml={targetYaml} />;
  }

  // Monaco diff: original (baseline) → modified (target), same as `git diff baseline target`.
  return (
    <WorkflowChangeHistoryPreview
      baselineYaml={baselineYaml}
      targetYaml={targetYaml}
      diffTelemetry={diffTelemetry}
      compareIndicator={getWorkflowChangeHistoryCompareIndicator(compareSpec)}
    />
  );
};
