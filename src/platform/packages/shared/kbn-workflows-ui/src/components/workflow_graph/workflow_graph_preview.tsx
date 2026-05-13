/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps } from '@kbn/workflows';
import { WorkflowGraphCanvas } from './workflow_graph_canvas';

export interface WorkflowGraphPreviewProps {
  workflow: WorkflowYaml;
  width?: number;
  height?: number;
}

const MAX_PREVIEW_STEPS = 11;

/**
 * Compact, static graph preview suitable for popovers / list cells. Renders
 * the same `WorkflowGraphCanvas` in `previewMode` — icon-only nodes, no
 * minimap, no banner, no interaction, autofit.
 *
 * Workflows with more than MAX_PREVIEW_STEPS total steps (including nested
 * steps inside loops) show a "too large to preview" placeholder instead.
 */
export function WorkflowGraphPreview({
  workflow,
  width = 320,
  height = 240,
}: WorkflowGraphPreviewProps) {
  const totalSteps = collectAllSteps(workflow.steps ?? []).length;
  const tooLarge = totalSteps > MAX_PREVIEW_STEPS;

  return (
    <div style={{ width, height }} data-test-subj="workflowGraphPreview">
      {tooLarge ? (
        <div
          css={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          data-test-subj="workflowGraphPreviewTooLarge"
        >
          <EuiIcon type="graphApp" size="xl" aria-hidden={true} />
          <EuiText size="s" color="subdued" textAlign="center">
            {i18n.translate('workflowsUi.graphPreview.tooLarge', {
              defaultMessage: 'Workflow is too large to preview',
            })}
          </EuiText>
        </div>
      ) : (
        <WorkflowGraphCanvas workflow={workflow} isYamlValid onStepSelect={noop} previewMode />
      )}
    </div>
  );
}

function noop() {}
