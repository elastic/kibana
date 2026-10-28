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
import { ChangeHistoryPreview, ChangeHistoryPreviewFooterSpacer } from '@kbn/change-history-ui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getWorkflowValidationDisplayOptions } from '@kbn/workflows-ui';
import { WorkflowChangeHistoryPreviewSettings } from './workflow_change_history_preview_settings';
import { WorkflowChangeHistoryPreviewValidation } from './workflow_change_history_preview_validation';

const componentStyles = {
  /** Styles for the validation decoration classes applied by the workflow YAML validation. */
  validationDecorations: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.template-variable-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
      '.template-variable-warning': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
      '.liquid-template-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
      '.liquid-template-warning': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
      '.duplicate-step-name-error': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
      },
      '.yaml-error': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
      '.yaml-warning': {
        backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
        borderRadius: '2px',
      },
    }),
};

export interface WorkflowChangeHistoryMonacoPreviewProps {
  baselineYaml?: string;
  targetYaml: string;
  compareSpec?: Parameters<ChangeHistoryPreviewRenderFn>[0]['compareSpec'];
  diffTelemetry?: Parameters<ChangeHistoryPreviewRenderFn>[0]['diffTelemetry'];
}

/** Monaco preview (single version or diff) for a workflow YAML, with optional validation highlighting. */
export const WorkflowChangeHistoryMonacoPreview = ({
  baselineYaml,
  targetYaml,
  compareSpec,
  diffTelemetry,
}: WorkflowChangeHistoryMonacoPreviewProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);
  const [highlightValidationErrors, setHighlightValidationErrors] = useState(false);
  // Read-only editors hide validation squiggles and hovers unless explicitly enabled.
  const editorOptions = useMemo(
    () => getWorkflowValidationDisplayOptions(highlightValidationErrors),
    [highlightValidationErrors]
  );

  return (
    <ChangeHistoryPreview
      baseline={baselineYaml}
      target={targetYaml}
      language="yaml"
      diffTelemetry={diffTelemetry}
      compareSpec={compareSpec}
      containerCss={styles.validationDecorations}
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
