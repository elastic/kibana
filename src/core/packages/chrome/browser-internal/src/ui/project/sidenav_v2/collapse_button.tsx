/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  logicalCSS,
  logicalSizeCSS,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { isObservable, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { PRIMARY_NAVIGATION_ID } from '@kbn/core-chrome-navigation/src/constants';

interface Props {
  isCollapsed: boolean | Observable<boolean>;
  toggle: (isCollapsed: boolean) => void;
}

const sideNavCollapseButtonStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  // packages/eui/src/components/header/header.styles.ts
  const height = euiTheme.size.xxxl; // TODO: hardcoded height of the euiHeader header
  const padding = euiTheme.size.s; // TODO: hardcoded padding of the euiHeader header

  return {
    sideNavCollapseButtonWrapper: css`
      display: flex;
      align-items: center;
      justify-content: center;
      ${logicalSizeCSS(height)}
      ${logicalCSS('border-right', euiTheme.border.thin)}
      ${logicalCSS('margin-left', `-${padding}`)}
      ${logicalCSS('margin-right', padding)}
    `,
    sideNavCollapseButton: css`
      &.euiButtonIcon:hover {
        transform: none;
      }
    `,
  };
};

/**
 * Reimplementation of EuiCollapsibleNavBeta Collapse Button to survey new sidenav and new layout use-cases
 */
export const SideNavV2CollapseButton: FC<Props> = ({ isCollapsed, toggle, ...rest }) => {
  const collapsedObservable = useMemo(
    () => (isObservable(isCollapsed) ? isCollapsed : of(isCollapsed)),
    [isCollapsed]
  );

  const collapsed = useObservable(
    collapsedObservable,
    typeof isCollapsed === 'boolean' ? isCollapsed : false
  );

  const iconType = collapsed ? 'transitionLeftIn' : 'transitionLeftOut';
  const { euiTheme } = useEuiTheme();
  const styles = sideNavCollapseButtonStyles(euiTheme);

  const isSmall = useIsWithinBreakpoints(['xs', 's']);
  if (isSmall) return null;

  return (
    <div className="sideNavCollapseButtonWrapper" css={styles.sideNavCollapseButtonWrapper}>
      <EuiButtonIcon
        data-test-subj="sideNavCollapseButton"
        css={styles.sideNavCollapseButton}
        size="s"
        color="text"
        iconType={iconType}
        aria-label={
          collapsed
            ? i18n.translate('core.ui.chrome.sideNavigation.expandButtonLabel', {
                defaultMessage: 'Expand navigation menu',
              })
            : i18n.translate('core.ui.chrome.sideNavigation.collapseButtonLabel', {
                defaultMessage: 'Collapse navigation menu',
              })
        }
        aria-pressed={!collapsed}
        aria-expanded={!collapsed}
        aria-controls={PRIMARY_NAVIGATION_ID}
        onClick={() => toggle(!collapsed)}
      />
    </div>
  );
};
