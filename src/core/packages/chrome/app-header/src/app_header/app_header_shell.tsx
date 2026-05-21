/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { AppHeaderPadding } from '../types';

export const APPLICATION_TOP_BAR_MIN_HEIGHT_PX = 48;

export interface AppHeaderShellProps {
  title?: ReactNode;
  badges?: ReactNode;
  titleActions?: ReactNode;
  titleAppend?: ReactNode;
  trailing?: ReactNode;
  tabs?: ReactNode;
  sticky?: boolean;
  padding?: AppHeaderPadding;
}

const resolveLayoutProps = (
  sticky: boolean,
  padding: AppHeaderPadding | undefined,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
) => {
  const resolved = padding ?? (sticky ? 'm' : 'none');

  if (resolved === 'none') {
    return { paddingInline: undefined, paddingBlock: undefined, bleedMargin: undefined };
  }

  if (resolved === 'm') {
    return {
      paddingInline: euiTheme.size.m,
      paddingBlock: euiTheme.size.m,
      bleedMargin: undefined,
    };
  }

  const bleedMargin = resolved.bleed === 'l' ? euiTheme.size.l : euiTheme.size.m;
  const size = resolved.size ?? resolved.bleed;

  let paddingInline: string | undefined;
  let paddingBlock: string | undefined;
  if (size === 'l') {
    paddingInline = euiTheme.size.base;
    paddingBlock = euiTheme.size.base;
  } else if (size === 'm') {
    paddingInline = euiTheme.size.m;
    paddingBlock = euiTheme.size.m;
  }

  return { paddingInline, paddingBlock, bleedMargin };
};

const useHeaderStyles = (
  sticky: boolean,
  padding: AppHeaderPadding | undefined,
  hasTabs: boolean,
  hasPrimaryContent: boolean
) => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const { paddingInline, paddingBlock, bleedMargin } = resolveLayoutProps(
      sticky,
      padding,
      euiTheme
    );

    const root = css`
      ${sticky &&
      css`
        position: sticky;
        top: 0;
        z-index: ${euiTheme.levels.mask};
      `}
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: ${APPLICATION_TOP_BAR_MIN_HEIGHT_PX}px;
      box-sizing: border-box;
      padding: 0;
      ${paddingInline &&
      css`
        padding-inline: ${paddingInline};
      `}
      ${bleedMargin &&
      css`
        margin-inline: -${bleedMargin};
        margin-top: -${bleedMargin};
      `}
      background: ${euiTheme.colors.backgroundBasePlain};
      border-bottom: ${euiTheme.border.thin};
      margin-bottom: -${euiTheme.border.width.thin};

      &:hover .titleActionsReveal,
      &:focus-within .titleActionsReveal {
        opacity: 1;
        pointer-events: auto;
      }
    `;

    const primaryRow = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.m};
      min-width: 0;
      min-height: ${APPLICATION_TOP_BAR_MIN_HEIGHT_PX}px;
      ${paddingBlock &&
      css`
        padding-block-start: ${paddingBlock};
        padding-block-end: ${hasTabs ? euiTheme.size.xs : paddingBlock};
      `}
    `;

    const titleCluster = css`
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    `;

    const titleGroup = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
    `;

    const titleClusterSpacer = css`
      flex: ${hasPrimaryContent ? '0 0 auto' : '1 1 auto'};
      min-width: 0;
    `;

    const titleAppend = css`
      display: flex;
      align-items: center;
      flex: 1 1 auto;
      min-width: 0;
    `;

    const tabsRow = css`
      display: flex;
      align-items: stretch;
    `;

    const titleActionsReveal = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: ${euiTheme.size.xs};
      opacity: 0;
      pointer-events: none;
      transition: opacity ${euiTheme.animation.fast} ease;
    `;

    return {
      root,
      primaryRow,
      titleCluster,
      titleGroup,
      titleClusterSpacer,
      titleAppend,
      titleActionsReveal,
      tabsRow,
    };
  }, [euiTheme, sticky, padding, hasTabs, hasPrimaryContent]);
};

export const AppHeaderShell = React.memo<AppHeaderShellProps>(
  ({ title, badges, titleActions, titleAppend, trailing, tabs, sticky = true, padding }) => {
    const hasTitleAppend = titleAppend != null;
    const styles = useHeaderStyles(sticky, padding, !!tabs, hasTitleAppend);

    return (
      <div css={styles.root} data-test-subj="appHeader">
        <div css={styles.primaryRow}>
          <div css={styles.titleCluster}>
            <div css={styles.titleGroup}>
              {title}
              {badges}
              {titleActions && (
                <div className="titleActionsReveal" css={styles.titleActionsReveal}>
                  {titleActions}
                </div>
              )}
            </div>
            {hasTitleAppend && <div css={styles.titleAppend}>{titleAppend}</div>}
            <div css={styles.titleClusterSpacer} aria-hidden />
          </div>
          {trailing}
        </div>
        {tabs && (
          <div css={styles.tabsRow} data-test-subj="appHeaderTabs">
            {tabs}
          </div>
        )}
      </div>
    );
  }
);

AppHeaderShell.displayName = 'AppHeaderShell';
