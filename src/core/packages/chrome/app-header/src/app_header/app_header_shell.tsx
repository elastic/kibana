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
import type { AppHeaderSpacing } from '../types';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

// Minimum single-row bar height. Height is otherwise driven by content plus the symmetric vertical
// padding; this floor keeps short headers (e.g. a title with no trailing control) at the same height
// as a row with a 32px control (16px + 32px + 16px). The dense `compact` mode uses a shorter floor.
const STANDARD_MIN_HEIGHT_PX = 64;
const COMPACT_MIN_HEIGHT_PX = 48;

export interface AppHeaderShellProps {
  title?: ReactNode;
  badges?: ReactNode;
  titleActions?: ReactNode;
  titleAppend?: ReactNode;
  trailing?: ReactNode;
  metadata?: ReactNode;
  tabs?: ReactNode;
  sticky?: boolean;
  spacing?: AppHeaderSpacing;
  borderless?: boolean;
}

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

// Horizontal content inset per mode. `flush` hands the inset to the parent, so the header applies
// none itself.
const spacingInset = (spacing: AppHeaderSpacing, euiTheme: EuiTheme): string | undefined => {
  switch (spacing) {
    case 'flush':
      return undefined;
    case 'compact':
      return euiTheme.size.s;
    case 'standard':
    case 'bleed':
      return euiTheme.size.base;
    case 'largeBleed':
      return euiTheme.size.l;
    default: {
      const exhaustive: never = spacing;
      return exhaustive;
    }
  }
};

const resolveSpacing = (spacing: AppHeaderSpacing = 'standard', euiTheme: EuiTheme) => {
  const inset = spacingInset(spacing, euiTheme);
  const isBleed = spacing === 'bleed' || spacing === 'largeBleed';

  return {
    paddingInline: inset,
    // Vertical padding matches the horizontal inset so content sits the same distance from every
    // edge. `flush` keeps the standard vertical padding while the parent owns the horizontal inset.
    paddingBlock: inset ?? euiTheme.size.base,
    // Bleed pulls the header out to the parent's edges with a matching negative margin, then re-insets
    // its content by the same token so it stays on the parent's page grid.
    bleedMargin: isBleed ? inset : undefined,
    minHeight: spacing === 'compact' ? COMPACT_MIN_HEIGHT_PX : STANDARD_MIN_HEIGHT_PX,
  };
};

const useHeaderStyles = (
  sticky: boolean,
  spacing: AppHeaderSpacing | undefined,
  hasTabs: boolean,
  hasTitleAppend: boolean,
  hasMetadata: boolean,
  borderless: boolean
) => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const { paddingInline, paddingBlock, bleedMargin, minHeight } = resolveSpacing(
      spacing,
      euiTheme
    );

    // A row followed by another collapses its bottom gap so the next row sits close (and tabs stay
    // flush with the header's bottom border); otherwise it uses the symmetric vertical padding.
    const bottomPad = (followed: boolean) => (followed ? euiTheme.size.xs : paddingBlock);

    // The min-height floor keeps a short single-row header from getting too thin. Multi-row headers
    // already gain height from their extra rows and shrink the primary row's bottom padding, so the
    // floor there would only add dead space.
    const isMultiRow = hasTabs || hasMetadata;

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
      box-sizing: border-box;
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
      ${!borderless &&
      css`
        border-bottom: ${euiTheme.border.thin};
        margin-bottom: -${euiTheme.border.width.thin};
      `}

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
      box-sizing: border-box;
      ${!isMultiRow &&
      css`
        min-height: ${minHeight}px;
      `}
      ${!hasTitleAppend &&
      css`
        padding-block-start: ${paddingBlock};
        padding-block-end: ${bottomPad(hasTabs || hasMetadata)};
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
      ${hasTitleAppend &&
      css`
        max-width: min(40%, 360px);
      `}
    `;

    const titleClusterSpacer = css`
      flex: ${hasTitleAppend ? '0 0 auto' : '1 1 auto'};
      min-width: 0;
    `;

    const titleAppend = css`
      display: flex;
      align-items: center;
      flex: 1 1 0;
      min-width: 0;
    `;

    const trailingSlot = css`
      flex-shrink: 0;
    `;

    const tabsRow = css`
      display: flex;
      align-items: stretch;
    `;

    const metadataRow = css`
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      column-gap: ${euiTheme.size.m};
      row-gap: ${euiTheme.size.xs};
      min-width: 0;
      padding-block-end: ${bottomPad(hasTabs)};
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
      trailingSlot,
      titleActionsReveal,
      metadataRow,
      tabsRow,
    };
  }, [sticky, spacing, euiTheme, hasTabs, hasTitleAppend, hasMetadata, borderless]);
};

export const AppHeaderShell = React.memo<AppHeaderShellProps>(
  ({
    title,
    badges,
    titleActions,
    titleAppend,
    metadata,
    trailing,
    tabs,
    sticky = true,
    spacing,
    borderless = false,
  }) => {
    const hasTitleAppend = titleAppend != null;
    const styles = useHeaderStyles(sticky, spacing, !!tabs, hasTitleAppend, !!metadata, borderless);

    return (
      <div css={styles.root} data-test-subj={APP_HEADER_TEST_SUBJECTS.root}>
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
          {trailing && <div css={styles.trailingSlot}>{trailing}</div>}
        </div>
        {metadata && (
          <div css={styles.metadataRow} data-test-subj={APP_HEADER_TEST_SUBJECTS.metadata}>
            {metadata}
          </div>
        )}
        {tabs && (
          <div css={styles.tabsRow} data-test-subj={APP_HEADER_TEST_SUBJECTS.tabs}>
            {tabs}
          </div>
        )}
      </div>
    );
  }
);

AppHeaderShell.displayName = 'AppHeaderShell';
