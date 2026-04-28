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
import { usePublishHeight } from './hooks/use_publish_height';

export const APPLICATION_TOP_BAR_MIN_HEIGHT_PX = 48;

export const APP_HEADER_HEIGHT_CSS_VAR_NAME = '--kbn-appHeader--height';

export interface AppHeaderShellProps {
  title?: ReactNode;
  badges?: ReactNode;
  titleActions?: ReactNode;
  trailing?: ReactNode;
  metadata?: ReactNode;
  callout?: ReactNode;
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
    return { paddingInline: undefined, bleedMargin: undefined };
  }

  if (resolved === 'm') {
    return { paddingInline: euiTheme.size.m, bleedMargin: undefined };
  }

  const bleedMargin = resolved.bleed === 'l' ? euiTheme.size.l : euiTheme.size.m;
  const size = resolved.size ?? resolved.bleed;

  let paddingInline: string | undefined;
  if (size === 'l') {
    paddingInline = euiTheme.size.l;
  } else if (size === 'm') {
    paddingInline = euiTheme.size.m;
  }

  return { paddingInline, bleedMargin };
};

const useHeaderStyles = (sticky: boolean, padding: AppHeaderPadding | undefined) => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const { paddingInline, bleedMargin } = resolveLayoutProps(sticky, padding, euiTheme);

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
      flex: 1 1 auto;
      min-width: 0;
    `;

    const metadataRow = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      padding-bottom: ${euiTheme.size.s};
    `;

    const calloutRow = css`
      padding-bottom: ${euiTheme.size.s};
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
      titleActionsReveal,
      metadataRow,
      calloutRow,
      tabsRow,
    };
  }, [euiTheme, sticky, padding]);
};

export const AppHeaderShell = React.memo<AppHeaderShellProps>(
  ({ title, badges, titleActions, trailing, metadata, callout, tabs, sticky = true, padding }) => {
    const styles = useHeaderStyles(sticky, padding);
    const rootRef = usePublishHeight(APP_HEADER_HEIGHT_CSS_VAR_NAME, sticky);

    return (
      <div ref={rootRef} css={styles.root} data-test-subj="appHeader">
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
            <div css={styles.titleClusterSpacer} aria-hidden />
          </div>
          {trailing}
        </div>
        {metadata && (
          <div css={styles.metadataRow} data-test-subj="appHeaderMetadata">
            {metadata}
          </div>
        )}
        {callout && (
          <div css={styles.calloutRow} data-test-subj="appHeaderCallout">
            {callout}
          </div>
        )}
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
