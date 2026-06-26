/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { SIDE_PANEL_ID } from '../constants';

interface Props {
  excludeFromRovingFocus?: boolean;
  isCollapsed: boolean;
  toggle: (isCollapsed: boolean) => void;
}

const sideNavCollapseButtonStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  return {
    sideNavCollapseButtonWrapper: css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `,
    sideNavCollapseButton: css`
      color: ${euiTheme.colors.textSubdued};

      &:hover:not(:disabled),
      &:focus-visible:not(:disabled) {
        color: ${euiTheme.colors.textParagraph};
      }

      &.euiButtonIcon:hover {
        transform: none;
      }
    `,
  };
};

/**
 * Collapse button for the secondary navigation side panel.
 */
export const SideNavCollapseButton: FC<Props> = ({
  excludeFromRovingFocus = false,
  isCollapsed,
  toggle,
}) => {
  const { euiTheme } = useEuiTheme();
  const iconType = isCollapsed ? 'transitionLeftIn' : 'transitionLeftOut';
  const styles = useMemo(() => sideNavCollapseButtonStyles(euiTheme), [euiTheme]);

  const expandLabel = i18n.translate('kbnUI.sideNavigation.expandButtonLabel', {
    defaultMessage: 'Expand navigation menu',
  });
  const collapseLabel = i18n.translate('kbnUI.sideNavigation.collapseButtonLabel', {
    defaultMessage: 'Collapse navigation menu',
  });
  const buttonLabel = isCollapsed ? expandLabel : collapseLabel;

  return (
    <div className="sideNavCollapseButtonWrapper" css={styles.sideNavCollapseButtonWrapper}>
      <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          data-side-nav-roving-exempt={excludeFromRovingFocus ? true : undefined}
          data-test-subj="sideNavCollapseButton"
          css={styles.sideNavCollapseButton}
          size="xs"
          color="text"
          iconType={iconType}
          tabIndex={excludeFromRovingFocus ? -1 : undefined}
          aria-label={buttonLabel}
          aria-pressed={!isCollapsed}
          aria-expanded={!isCollapsed}
          aria-controls={SIDE_PANEL_ID}
          onClick={() => toggle(!isCollapsed)}
        />
      </EuiToolTip>
    </div>
  );
};
