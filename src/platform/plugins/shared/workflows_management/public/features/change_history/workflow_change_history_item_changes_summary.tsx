/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export interface WorkflowChangeSummaryGroup {
  title: string;
  lines: readonly string[];
}

export interface WorkflowChangeHistoryItemChangesSummaryProps {
  groups: readonly WorkflowChangeSummaryGroup[];
}

export const WorkflowChangeHistoryItemChangesSummary = ({
  groups,
}: WorkflowChangeHistoryItemChangesSummaryProps): JSX.Element | null => {
  const visibleGroups = groups.filter((group) => group.lines.length > 0);

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      responsive={false}
      data-test-subj="workflowChangeHistoryItemChangesSummary"
    >
      {visibleGroups.map((group) => (
        <EuiFlexItem key={group.title} grow={false}>
          <EuiText size="xs">
            <strong>{group.title}</strong>
          </EuiText>
          {group.lines.map((line) => (
            <EuiText
              key={line}
              size="xs"
              css={css`
                padding-left: 8px;
              `}
            >
              {line}
            </EuiText>
          ))}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
