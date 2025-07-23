/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, UseEuiTheme, logicalCSS, logicalSizeCSS, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { FC, useMemo } from 'react';
import { Observable, isObservable, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

interface Props {
  isCollapsed: boolean | Observable<boolean>;
  toggle: (isCollapsed: boolean) => void;
  'aria-controls'?: string;
}

const collapsibleButtonStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  // packages/eui/src/components/header/header.styles.ts
  const height = euiTheme.size.xxxl; // TODO: hardcoded height of the euiHeader header
  const padding = euiTheme.size.s; // TODO: hardcoded padding of the euiHeader header

  return {
    collapsibleNavButtonWrapper: css`
      display: flex;
      align-items: center;
      justify-content: center;
      ${logicalSizeCSS(height)}
      ${logicalCSS('border-right', euiTheme.border.thin)}
      ${logicalCSS('margin-left', `-${padding}`)}
      ${logicalCSS('margin-right', padding)}
    `,
    collapsibleNavButton: css`
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

  const iconType = collapsed ? 'menuRight' : 'menuLeft';
  const { euiTheme } = useEuiTheme();
  const styles = collapsibleButtonStyles(euiTheme);

  return (
    <div className="collapsibleNavButtonWrapper" css={styles.collapsibleNavButtonWrapper}>
      <EuiButtonIcon
        data-test-subj="collapsibleNavButton"
        css={styles.collapsibleNavButton}
        size="s"
        color="text"
        iconType={iconType}
        {...rest}
        aria-label={collapsed ? 'Expand side navigation' : 'Collapse side navigation'}
        aria-pressed={!collapsed}
        aria-expanded={!collapsed}
        onClick={() => toggle(!collapsed)}
      />
    </div>
  );
};
