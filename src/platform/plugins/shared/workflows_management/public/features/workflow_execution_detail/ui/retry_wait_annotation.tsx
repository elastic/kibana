/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  TREE_ROW_CHEVRON_SLOT_PX,
  TREE_ROW_GAP_SIZE,
  TREE_ROW_ICON_SLOT_PX,
  TREE_ROW_PADDING_X_SIZE,
  TREE_ROW_PADDING_Y_PX,
} from './step_execution_tree_row';
import { formatDuration } from '../../../shared/lib/format_duration';

export interface RetryWaitAnnotationProps {
  durationMs: number;
  /** Match sibling rows: include chevron gutter only when the group reserves it. */
  reserveChevronSlot?: boolean;
  'data-test-subj'?: string;
}

/**
 * Presentational wait between retry attempts — not a tree row (no hover/click/focus).
 * Left padding aligns with the sibling group's text column (after icon), not the glyph.
 */
export const RetryWaitAnnotation = React.memo<RetryWaitAnnotationProps>(
  ({
    durationMs,
    reserveChevronSlot = true,
    'data-test-subj': dataTestSubj = 'workflowStepTreeRetryWait',
  }) => {
    const { euiTheme } = useEuiTheme();
    const label = i18n.translate('workflows.WorkflowStepExecutionTree.retryWaitAnnotation', {
      defaultMessage: 'waited {duration}',
      values: { duration: formatDuration(durationMs).trim() },
    });

    const chevronGutter = reserveChevronSlot
      ? `${TREE_ROW_CHEVRON_SLOT_PX}px + ${euiTheme.size[TREE_ROW_GAP_SIZE]} + `
      : '';

    return (
      <div
        role="presentation"
        data-test-subj={dataTestSubj}
        data-reserve-chevron-slot={reserveChevronSlot ? 'true' : 'false'}
        css={css`
          padding: ${TREE_ROW_PADDING_Y_PX}px ${euiTheme.size[TREE_ROW_PADDING_X_SIZE]};
          padding-left: calc(
            ${euiTheme.size[TREE_ROW_PADDING_X_SIZE]} + ${chevronGutter}${TREE_ROW_ICON_SLOT_PX}px +
              ${euiTheme.size[TREE_ROW_GAP_SIZE]}
          );
        `}
      >
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            font-style: italic;
            line-height: 1.2;
          `}
        >
          {label}
        </EuiText>
      </div>
    );
  }
);

RetryWaitAnnotation.displayName = 'RetryWaitAnnotation';
