/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from '@kbn/ui-side-navigation';
import { useSideNavWidth } from '@kbn/core-chrome-browser-hooks';
import { CHROME_HEADER_TEST_SUBJECTS } from '../test_subjects';

const HEADER_HEIGHT_PX = 48;

const logoSlot = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--logo-width)',
  height: HEADER_HEIGHT_PX,
  flexShrink: 0,
});

export interface ChromeHeaderShellProps {
  logo?: ReactNode;
  switcher?: ReactNode;
  projectPicker?: ReactNode;
  search?: ReactNode;
  help?: ReactNode;
  actions?: ReactNode;
  userMenu?: ReactNode;
  appendRight?: ReactNode;
}

export type GlobalHeaderRightGroupProps = Pick<
  ChromeHeaderShellProps,
  'search' | 'help' | 'actions' | 'userMenu' | 'appendRight'
>;

const useChromeHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      align-items: center;
      height: ${HEADER_HEIGHT_PX}px;
      box-sizing: border-box;
      padding: 0 ${euiTheme.size.s} 0 0;
      background: ${euiTheme.colors.backgroundTransparent};
    `;

    const leftGroup = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    const switcherSlot = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      margin-inline-end: ${euiTheme.size.xs};
      margin-inline-start: ${euiTheme.size.xs};
    `;

    const spacer = css`
      flex: 1 1 auto;
      min-width: 0;
    `;

    const projectPickerSlot = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-inline-start: ${euiTheme.size.xs};
    `;


    const rightGroup = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
      gap: ${euiTheme.size.s};
    `;

    const searchSlot = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    const actionsSlot = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
    `;

    const helpSlot = css`
      display: flex;
      align-items: center;
    `;

    const userMenuSlot = css`
      display: flex;
      align-items: center;
    `;

    const appendRightSlot = css`
      display: flex;
      align-items: center;
    `;


    const separator = css`
      width: 1px;
      height: 24px;
      flex-shrink: 0;
      background: ${euiTheme.colors.borderBaseSubdued};
    `;

    return {
      root,
      leftGroup,
      switcherSlot,
      projectPickerSlot,
      spacer,

      rightGroup,
      searchSlot,
      actionsSlot,
      helpSlot,
      userMenuSlot,
      appendRightSlot,
      separator,
    };
  }, [euiTheme]);
};

export const GlobalHeaderRightGroup = React.memo<GlobalHeaderRightGroupProps>(
  ({ search, help, actions, userMenu, appendRight }) => {
    const styles = useChromeHeaderStyles();

    return (
      <div css={styles.rightGroup}>
        {search && (
          <div css={styles.searchSlot} data-test-subj="chromeNextGlobalHeaderSearch">
            {search}
          </div>
        )}
        {help && (
          <div css={styles.helpSlot} data-test-subj="chromeNextGlobalHeaderHelp">
            {help}
          </div>
        )}
        {actions && (
          <div css={styles.actionsSlot} data-test-subj="chromeNextGlobalHeaderActions">
            {actions}
          </div>
        )}
        {userMenu && (
          <div css={styles.userMenuSlot} data-test-subj="chromeNextGlobalHeaderUserMenu">
            {userMenu}
          </div>
        )}
        {appendRight && (
          <div css={styles.appendRightSlot} data-test-subj="chromeNextGlobalHeaderAppendRight">
            {appendRight}
          </div>
        )}
      </div>
    );
  }
);

GlobalHeaderRightGroup.displayName = 'GlobalHeaderRightGroup';

export const ChromeHeaderShell = React.memo<ChromeHeaderShellProps>(
  ({ logo, switcher, projectPicker, search, help, actions, userMenu, appendRight }) => {
    const sideNavWidth = useSideNavWidth();
    const styles = useChromeHeaderStyles();
    const logoWidth = sideNavWidth <= COLLAPSED_WIDTH ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
      <header css={styles.root} data-test-subj={CHROME_HEADER_TEST_SUBJECTS.root}>
        <div css={styles.leftGroup}>
          <div css={logoSlot} style={{ '--logo-width': `${logoWidth}px` } as React.CSSProperties}>
            {logo}
          </div>
          {switcher && (
            <>
              <div css={styles.separator} />
              <div css={styles.switcherSlot} data-test-subj={CHROME_HEADER_TEST_SUBJECTS.switcher}>
                {switcher}
              </div>
            </>
          )}
        </div>
        <div css={styles.separator} />
        {projectPicker && (
          <div
            css={styles.projectPickerSlot}
            data-test-subj={CHROME_HEADER_TEST_SUBJECTS.projectPicker}
          >
            {projectPicker}
          </div>
        )}
        <div css={styles.spacer} />
        <GlobalHeaderRightGroup
          search={search}
          help={help}
          actions={actions}
          userMenu={userMenu}
          appendRight={appendRight}
        />
      </header>
    );
  }
);

ChromeHeaderShell.displayName = 'ChromeHeaderShell';
