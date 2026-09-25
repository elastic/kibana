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
import { CHROME_HEADER_TEST_SUBJECTS } from '../test_subjects';

export interface HeaderRightGroupProps {
  search?: ReactNode;
  help?: ReactNode;
  actions?: ReactNode;
  userMenu?: ReactNode;
}

const useHeaderRightGroupStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
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

    return {
      rightGroup,
      searchSlot,
      actionsSlot,
      helpSlot,
      userMenuSlot,
    };
  }, [euiTheme]);
};

export const HeaderRightGroup = React.memo<HeaderRightGroupProps>(
  ({ search, help, actions, userMenu }) => {
    const styles = useHeaderRightGroupStyles();

    return (
      <div css={styles.rightGroup}>
        {search && (
          <div css={styles.searchSlot} data-test-subj={CHROME_HEADER_TEST_SUBJECTS.search}>
            {search}
          </div>
        )}
        {help && (
          <div css={styles.helpSlot} data-test-subj={CHROME_HEADER_TEST_SUBJECTS.help}>
            {help}
          </div>
        )}
        {actions && (
          <div css={styles.actionsSlot} data-test-subj={CHROME_HEADER_TEST_SUBJECTS.actions}>
            {actions}
          </div>
        )}
        {userMenu && (
          <div css={styles.userMenuSlot} data-test-subj={CHROME_HEADER_TEST_SUBJECTS.userMenu}>
            {userMenu}
          </div>
        )}
      </div>
    );
  }
);

HeaderRightGroup.displayName = 'HeaderRightGroup';
