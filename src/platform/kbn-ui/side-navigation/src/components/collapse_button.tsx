/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { SIDE_PANEL_ID } from '../constants';

interface Props {
  isCollapsed: boolean;
  toggle: (isCollapsed: boolean) => void;
}

const sideNavCollapseButtonStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  return {
    sideNavCollapseButtonWrapper: css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-right: 4px;
    `,
    sideNavCollapseButton: css`
      &.euiButtonIcon:hover {
        transform: none;
      }
    `,
  };
};

/**
 * Collapse button for the side navigation
 */
export const SideNavCollapseButton: FC<Props> = ({ isCollapsed, toggle }) => {
  const iconType = isCollapsed ? 'transitionLeftIn' : 'transitionLeftOut';
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => sideNavCollapseButtonStyles(euiTheme), [euiTheme]);

  return (
    <div className="sideNavCollapseButtonWrapper" css={styles.sideNavCollapseButtonWrapper}>
      <EuiToolTip
        content={
          isCollapsed
            ? i18n.translate('kbnUI.sideNavigation.expandSecondaryPanelButtonLabel', {
                defaultMessage: 'Expand secondary navigation panel',
              })
            : i18n.translate('kbnUI.sideNavigation.collapseSecondaryPanelButtonLabel', {
                defaultMessage: 'Collapse secondary navigation panel',
              })
        }
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          data-test-subj="sideNavCollapseButton"
          css={styles.sideNavCollapseButton}
          size="xs"
          color="text"
          iconType={iconType}
          tabIndex={-1}
          aria-label={
            isCollapsed
              ? i18n.translate('kbnUI.sideNavigation.expandSecondaryPanelButtonLabel', {
                  defaultMessage: 'Expand secondary navigation panel',
                })
              : i18n.translate('kbnUI.sideNavigation.collapseSecondaryPanelButtonLabel', {
                  defaultMessage: 'Collapse secondary navigation panel',
                })
          }
          aria-pressed={!isCollapsed}
          aria-expanded={!isCollapsed}
          aria-controls={SIDE_PANEL_ID}
          onClick={() => toggle(!isCollapsed)}
        />
      </EuiToolTip>
    </div>
  );
};
