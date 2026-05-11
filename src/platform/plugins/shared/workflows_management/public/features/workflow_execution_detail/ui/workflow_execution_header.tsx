/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonIcon, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';

const i18nTexts = {
  back: i18n.translate('workflowsManagement.executionHeader.back', {
    defaultMessage: 'Back',
  }),
  close: i18n.translate('workflowsManagement.executionHeader.close', {
    defaultMessage: 'Close',
  }),
};

export interface WorkflowExecutionTopBarProps {
  showBackButton: boolean;
  onClose: () => void;
}

export const WorkflowExecutionTopBar = React.memo<WorkflowExecutionTopBarProps>(
  ({ showBackButton, onClose }) => {
    const styles = useMemoCss(componentStyles);
    return (
      <div css={styles.topBar} data-test-subj="workflowExecutionTopBar">
        {showBackButton ? (
          <button
            type="button"
            onClick={onClose}
            css={styles.backButton}
            data-test-subj="workflowExecutionBackButton"
            aria-label={i18nTexts.back}
          >
            <EuiIcon type="arrowLeft" size="s" aria-hidden={true} />
            <span>{i18nTexts.back}</span>
          </button>
        ) : (
          <span />
        )}
        <EuiButtonIcon
          iconType="cross"
          color="text"
          aria-label={i18nTexts.close}
          onClick={onClose}
          data-test-subj="workflowExecutionCloseButton"
        />
      </div>
    );
  }
);
WorkflowExecutionTopBar.displayName = 'WorkflowExecutionTopBar';

const componentStyles = {
  topBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${euiTheme.size.m} ${euiTheme.size.base} ${euiTheme.size.s}`,
      backgroundColor: 'transparent',
    }),
  backButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      color: euiTheme.colors.textParagraph,
      fontSize: euiTheme.size.m,
      '&:hover': {
        color: euiTheme.colors.textPrimary,
      },
    }),
};
