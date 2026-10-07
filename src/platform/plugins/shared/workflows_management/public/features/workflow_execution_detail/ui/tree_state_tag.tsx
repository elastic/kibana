/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiFontSize, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

/**
 * Qualitative row labels (iteration pins, retry tip). Distinct from metric
 * pills (token counts, "N steps", "N attempts") which keep outlined EuiBadge.
 */
export type TreeStateTagKind =
  | 'failed'
  | 'latest'
  | 'running'
  | 'final'
  | 'recovered'
  | 'waitingForInput';

export interface TreeStateTagProps {
  kind: TreeStateTagKind;
  'data-test-subj'?: string;
}

const labelFor = (kind: TreeStateTagKind): string => {
  switch (kind) {
    case 'failed':
      return i18n.translate('workflowsManagement.stepExecutionTreeRow.failedTag', {
        defaultMessage: 'failed',
      });
    case 'running':
      return i18n.translate('workflowsManagement.stepExecutionTreeRow.runningTag', {
        defaultMessage: 'running',
      });
    case 'latest':
      return i18n.translate('workflowsManagement.stepExecutionTreeRow.latestTag', {
        defaultMessage: 'latest',
      });
    case 'final':
      return i18n.translate('workflowsManagement.stepExecutionTreeRow.finalTag', {
        defaultMessage: 'final',
      });
    case 'recovered':
      return i18n.translate('workflowsManagement.stepExecutionTreeRow.recoveredTag', {
        defaultMessage: 'recovered',
      });
    case 'waitingForInput':
      return i18n.translate('workflowsManagement.stepExecutionTreeRow.waitingForInputTag', {
        defaultMessage: 'waiting for input',
      });
  }
};

/**
 * State marker after the row name.
 * - `failed`: danger-filled chip
 * - others: plain muted ` · {label}` (same size as duration; no box)
 */
export const TreeStateTag = React.memo<TreeStateTagProps>(
  ({ kind, 'data-test-subj': dataTestSubj }) => {
    const euiThemeContext = useEuiTheme();
    const { euiTheme } = euiThemeContext;
    const testSubj = dataTestSubj ?? `workflowStepTreeStateTag-${kind}`;
    const label = labelFor(kind);

    if (kind === 'failed') {
      const { fontSize } = euiFontSize(euiThemeContext, 'xxs');
      return (
        <span
          data-test-subj={testSubj}
          css={css`
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            font-size: ${fontSize};
            font-weight: ${euiTheme.font.weight.medium};
            line-height: 1;
            text-transform: lowercase;
            padding: 1px ${euiTheme.size.xs};
            border-radius: ${euiTheme.border.radius.small};
            border: none;
            background-color: ${euiTheme.colors.backgroundFilledDanger};
            color: ${euiTheme.colors.textInverse};
          `}
        >
          {label}
        </span>
      );
    }

    return (
      <EuiText
        size="xs"
        color="subdued"
        data-test-subj={testSubj}
        css={css`
          flex-shrink: 0;
          line-height: 1;
          white-space: pre;
        `}
      >
        {` · ${label}`}
      </EuiText>
    );
  }
);

TreeStateTag.displayName = 'TreeStateTag';
