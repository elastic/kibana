/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { ChangeHistoryDetail, ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';

const getWorkflowYamlFromSnapshot = (snapshot: unknown): string => {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }

  const workflow = (snapshot as { workflow?: { yaml?: unknown } }).workflow;

  return typeof workflow?.yaml === 'string' ? workflow.yaml : '';
};

const WorkflowChangeHistoryPreviewContent = ({
  change,
}: {
  change: ChangeHistoryDetail;
}): JSX.Element => {
  return (
    <div
      css={css`
        height: 100%;
        box-sizing: border-box;
      `}
    >
      <EuiCodeBlock language="yaml" isCopyable paddingSize="none">
        {getWorkflowYamlFromSnapshot(change.snapshot)}
      </EuiCodeBlock>
    </div>
  );
};

/** Placeholder preview until Plan 3-3 wires read-only Monaco. */
export const renderWorkflowChangeHistoryPreview: ChangeHistoryPreviewRenderFn = ({ change }) => (
  <WorkflowChangeHistoryPreviewContent change={change} />
);
