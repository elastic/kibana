/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  FloatingToolbar,
  FloatingToolbarExpandButton,
  floatingToolbarStyles,
} from '../floating_toolbar/floating_toolbar';
import { useToolbarExpandAnimation } from '../selected_panels_toolbar/use_toolbar_expand_animation';

const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? '');

const strings = {
  getAriaLabel: () =>
    i18n.translate('dashboard.hintBar.ariaLabel', {
      defaultMessage: 'Dashboard shortcuts',
    }),
  getShiftClick: () =>
    i18n.translate('dashboard.hintBar.shiftClick', {
      defaultMessage: 'Shift + Click',
    }),
  getShiftDrag: () =>
    i18n.translate('dashboard.hintBar.shiftDrag', {
      defaultMessage: 'Shift + Drag',
    }),
  getSelect: () => i18n.translate('dashboard.hintBar.select', { defaultMessage: 'Select' }),
  getAreaSelect: () =>
    i18n.translate('dashboard.hintBar.areaSelect', { defaultMessage: 'Area select' }),
  getCopy: () =>
    i18n.translate('dashboard.hintBar.copy', { defaultMessage: 'Copy selected panels' }),
  getPaste: () =>
    i18n.translate('dashboard.hintBar.paste', { defaultMessage: 'Paste selected panels' }),
  getUndo: () => i18n.translate('dashboard.hintBar.undo', { defaultMessage: 'Undo' }),
  getRedo: () => i18n.translate('dashboard.hintBar.redo', { defaultMessage: 'Redo' }),
};

const Hint = ({ keys, children }: { keys: string; children: React.ReactNode }) => {
  const styles = useMemoCss(hintStyles);
  return (
    <span css={styles.hint}>
      <EuiBadge color="hollow" css={styles.badge}>
        {keys}
      </EuiBadge>
      <EuiText size="s" component="span">
        {children}
      </EuiText>
    </span>
  );
};

export interface DashboardHintBarProps {
  /** skips the entrance, e.g. when it replaces the toolbar after a keyboard action */
  skipEntrance?: boolean;
}

/**
 * Shows the dashboard's mouse and keyboard shortcuts while editing, when no panel is selected.
 * Collapsed it shows how to select panels; expanded it adds the keyboard shortcuts.
 */
export const DashboardHintBar = ({ skipEntrance }: DashboardHintBarProps) => {
  const shared = useMemoCss(floatingToolbarStyles);
  const styles = useMemoCss(hintStyles);
  const { isExpanded, isMoreMounted, toggle, frameRef, moreRef } = useToolbarExpandAnimation();
  const modifier = isMac() ? 'Cmd' : 'Ctrl';

  return (
    <FloatingToolbar
      frameRef={frameRef}
      skipEntrance={skipEntrance}
      role="region"
      aria-label={strings.getAriaLabel()}
      data-test-subj="dashboardHintBar"
    >
      <div css={shared.content}>
        {isMoreMounted && (
          <div ref={moreRef} css={shared.more} data-test-subj="dashboardHintBarMore">
            <div css={styles.row}>
              <Hint keys={`${modifier} + C`}>{strings.getCopy()}</Hint>
            </div>
            <div css={styles.row}>
              <Hint keys={`${modifier} + V`}>{strings.getPaste()}</Hint>
            </div>
            <div css={styles.row}>
              <Hint keys={`${modifier} + Z`}>{strings.getUndo()}</Hint>
            </div>
            <div css={styles.row}>
              <Hint keys={`${modifier} + Y`}>{strings.getRedo()}</Hint>
            </div>
            <EuiHorizontalRule margin="xs" />
          </div>
        )}
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={styles.mainHints}>
            <Hint keys={strings.getShiftClick()}>{strings.getSelect()}</Hint>
            <Hint keys={strings.getShiftDrag()}>{strings.getAreaSelect()}</Hint>
          </EuiFlexItem>
          <div css={shared.separator} aria-hidden />
          <EuiFlexItem grow={false}>
            <FloatingToolbarExpandButton
              isExpanded={isExpanded}
              onClick={toggle}
              data-test-subj="dashboardHintBarToggleMore"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </FloatingToolbar>
  );
};

const hintStyles = {
  hint: ({ euiTheme }: UseEuiTheme) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    whiteSpace: 'nowrap' as const,
  }),
  badge: {
    // the badge is a key cap, not a truncated label
    maxWidth: 'none',
    marginInline: 0,
  },
  mainHints: ({ euiTheme }: UseEuiTheme) => ({
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: euiTheme.size.l,
    paddingInlineStart: euiTheme.size.xs,
  }),
  row: ({ euiTheme }: UseEuiTheme) => ({
    padding: `${euiTheme.size.xs} ${euiTheme.size.xs}`,
  }),
};
