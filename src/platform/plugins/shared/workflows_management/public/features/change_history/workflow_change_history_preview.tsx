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
import { getWorkflowYamlFromSnapshot } from './get_workflow_yaml_from_snapshot';
import { WorkflowChangeHistoryMonacoPreview } from './workflow_change_history_monaco_preview';

export const renderWorkflowChangeHistoryPreview: ChangeHistoryPreviewRenderFn = ({
  change,
  compareChange,
}) => (
  <WorkflowChangeHistoryMonacoPreview
    yaml={getWorkflowYamlFromSnapshot(change.snapshot)}
    compareYaml={compareChange ? getWorkflowYamlFromSnapshot(compareChange.snapshot) : undefined}
  />
);
