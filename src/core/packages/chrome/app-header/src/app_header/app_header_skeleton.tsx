/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { APP_MENU_ITEM_LIMIT } from '@kbn/app-menu';
import React, { useMemo } from 'react';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

/**
 * Approximate the real title line and app-menu controls so the layout does not jump when
 * content arrives:
 * EuiTitle ~24px tall, EuiButtonIcon size="s" square, EuiButton size="s" primary.
 */
const TITLE_WIDTH_PX = 200;
const PRIMARY_WIDTH_PX = 96;
const DEFAULT_BUTTON_COUNT = 1;

const useSkeletonStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const menu = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    return { menu };
  }, [euiTheme]);
};

export const AppHeaderSkeletonTitle = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj={APP_HEADER_TEST_SUBJECTS.skeleton}>
      <EuiSkeletonRectangle width={TITLE_WIDTH_PX} height={euiTheme.size.l} borderRadius="m" />
    </div>
  );
});

AppHeaderSkeletonTitle.displayName = 'AppHeaderSkeletonTitle';

export interface AppHeaderSkeletonMenuProps {
  /**
   * App menu button placeholders on the left (overflow / secondary actions).
   * Defaults to 1. Clamped to {@link APP_MENU_ITEM_LIMIT}.
   */
  buttonCount?: number;
  /** Primary-action rectangle. Defaults to `true`. */
  hasPrimary?: boolean;
}

const resolveButtonCount = (buttonCount: number | undefined): number =>
  Math.min(Math.max(buttonCount ?? DEFAULT_BUTTON_COUNT, 0), APP_MENU_ITEM_LIMIT);

export const AppHeaderSkeletonMenu = React.memo<AppHeaderSkeletonMenuProps>(
  ({ buttonCount, hasPrimary = true }) => {
    const { euiTheme } = useEuiTheme();
    const styles = useSkeletonStyles();
    const resolvedButtonCount = resolveButtonCount(buttonCount);

    if (resolvedButtonCount === 0 && !hasPrimary) {
      return null;
    }

    return (
      <div css={styles.menu} data-test-subj={APP_HEADER_TEST_SUBJECTS.skeletonMenu}>
        {Array.from({ length: resolvedButtonCount }, (_unused, idx) => (
          <EuiSkeletonRectangle
            key={idx}
            width={euiTheme.size.xl}
            height={euiTheme.size.xl}
            borderRadius="m"
            ariaWrapperProps={idx === 0 ? undefined : { 'aria-hidden': true }}
          />
        ))}
        {hasPrimary && (
          <EuiSkeletonRectangle
            width={PRIMARY_WIDTH_PX}
            height={euiTheme.size.xl}
            borderRadius="m"
            ariaWrapperProps={resolvedButtonCount === 0 ? undefined : { 'aria-hidden': true }}
          />
        )}
      </div>
    );
  }
);

AppHeaderSkeletonMenu.displayName = 'AppHeaderSkeletonMenu';
