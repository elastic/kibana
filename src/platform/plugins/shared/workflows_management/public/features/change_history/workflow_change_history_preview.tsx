/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { getWorkflowChangeHistoryCompareIndicator } from './get_workflow_change_history_compare_indicator';
import { getWorkflowYamlFromSnapshot } from './get_workflow_yaml_from_snapshot';
import { WorkflowChangeHistoryMonacoPreview } from './workflow_change_history_monaco_preview';

const getYamlFromChange = (change: Parameters<ChangeHistoryPreviewRenderFn>[0]['change']): string =>
  getWorkflowYamlFromSnapshot(change.snapshot);

export const renderWorkflowChangeHistoryPreview: ChangeHistoryPreviewRenderFn = ({
  change,
  compareSpec,
  isLoadingCompareContext,
  diffTelemetry,
}) => {
  if (!compareSpec) {
    return <WorkflowChangeHistoryMonacoPreview targetYaml={getYamlFromChange(change)} />;
  }

  const baselineYaml = getYamlFromChange(compareSpec.baseline);
  const targetYaml = getYamlFromChange(compareSpec.target);

  if (isLoadingCompareContext) {
    return <WorkflowChangeHistoryMonacoPreview targetYaml={targetYaml} />;
  }

  // Monaco diff: original (baseline) → modified (target), same as `git diff baseline target`.
  return (
    <WorkflowChangeHistoryMonacoPreview
      baselineYaml={baselineYaml}
      targetYaml={targetYaml}
      validationYaml={targetYaml}
      diffTelemetry={diffTelemetry}
      compareIndicator={getWorkflowChangeHistoryCompareIndicator(compareSpec)}
    />
  );
};
