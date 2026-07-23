/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

export const WORKFLOW_CHANGE_HISTORY_PREVIEW_NAVIGATOR_HEIGHT = '54px';

export interface WorkflowChangeHistoryDiffNavigatorProps {
  currentIndex: number;
  totalChanges: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const WorkflowChangeHistoryDiffNavigator = ({
  currentIndex,
  totalChanges,
  onPrevious,
  onNext,
}: WorkflowChangeHistoryDiffNavigatorProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);

  const hasChanges = totalChanges > 0;
  const displayIndex = hasChanges ? Math.min(currentIndex + 1, totalChanges) : 0;
  const isFirst = !hasChanges || currentIndex <= 0;
  const isLast = !hasChanges || currentIndex >= totalChanges - 1;

  const previousChangeLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.diffNavigator.previous',
    { defaultMessage: 'Previous change' }
  );
  const nextChangeLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.diffNavigator.next',
    { defaultMessage: 'Next change' }
  );
  const noChangesLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.diffNavigator.noChanges',
    { defaultMessage: 'No changes' }
  );

  return (
    <EuiFlexGroup
      css={styles.toolbar}
      gutterSize="s"
      alignItems="center"
      responsive={false}
      wrap={false}
      data-test-subj="workflowChangeHistoryDiffNavigator"
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={previousChangeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="arrowLeft"
            size="s"
            color="text"
            css={[styles.navButton, isFirst && styles.navButtonDisabled]}
            aria-label={previousChangeLabel}
            onClick={onPrevious}
            disabled={isFirst}
            data-test-subj="workflowChangeHistoryDiffNavigatorPrevious"
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText css={styles.label} size="s" component="span">
          {hasChanges ? (
            <FormattedMessage
              id="xpack.workflowsManagement.changeHistory.diffNavigator.label"
              defaultMessage="{current} of {total} changes"
              values={{
                current: <strong>{displayIndex}</strong>,
                total: <strong>{totalChanges}</strong>,
              }}
            />
          ) : (
            noChangesLabel
          )}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={nextChangeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="arrowRight"
            size="s"
            color="text"
            css={[styles.navButton, isLast && styles.navButtonDisabled]}
            aria-label={nextChangeLabel}
            onClick={onNext}
            disabled={isLast}
            data-test-subj="workflowChangeHistoryDiffNavigatorNext"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  toolbar: ({ euiTheme }: UseEuiTheme) =>
    css(changeHistoryPreviewTypography, {
      display: 'inline-flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      height: WORKFLOW_CHANGE_HISTORY_PREVIEW_NAVIGATOR_HEIGHT,
      padding: `0 ${euiTheme.size.s}`,
      borderRadius: '10px',
      border: euiTheme.border.thin,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      boxShadow: euiTheme.shadows.s.down,
    }),
  label: css(changeHistoryPreviewTypography, {
    fontWeight: 400,
    whiteSpace: 'nowrap',

    '& strong': {
      fontWeight: 600,
    },
  }),
  navButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: euiTheme.size.l,
      height: euiTheme.size.l,
      padding: 0,
      border: 'none',
      borderRadius: euiTheme.border.radius.small,
      backgroundColor: 'transparent',
      color: euiTheme.colors.textParagraph,
      cursor: 'pointer',

      '&:hover:not(:disabled)': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },

      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
        outlineOffset: euiTheme.focus.width,
      },
    }),
  navButtonDisabled: ({ euiTheme }: UseEuiTheme) =>
    css({
      cursor: 'not-allowed',

      '&:disabled': {
        opacity: 1,
        color: euiTheme.colors.textDisabled,
      },
    }),
};
