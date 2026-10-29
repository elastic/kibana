/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiPopover, useEuiTheme, useGeneratedHtmlId, type UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { isMac } from '@kbn/shared-ux-utility';
import { FloatingToolbarButton } from '../floating_toolbar/floating_toolbar';

const COMMAND_KEY = isMac ? '⌘' : 'Ctrl';

const strings = {
  getTitle: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.title', {
      defaultMessage: 'Keyboard shortcuts',
    }),
  getCopy: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.copy', {
      defaultMessage: 'Copy selected panels',
    }),
  getPaste: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.paste', {
      defaultMessage: 'Paste selected panels',
    }),
  getUndo: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.undo', {
      defaultMessage: 'Undo',
    }),
  getRedo: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.redo', {
      defaultMessage: 'Redo',
    }),
  getDrag: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.dragGesture', {
      defaultMessage: 'Drag',
    }),
  getAreaSelect: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shortcuts.areaSelect', {
      defaultMessage: 'Area select',
    }),
};

const getShortcuts = () => [
  { label: strings.getCopy(), keys: [COMMAND_KEY, 'C'] },
  { label: strings.getPaste(), keys: [COMMAND_KEY, 'V'] },
  { label: strings.getUndo(), keys: [COMMAND_KEY, 'Z'] },
  { label: strings.getRedo(), keys: [COMMAND_KEY, 'Y'] },
  { label: strings.getAreaSelect(), keys: [COMMAND_KEY, strings.getDrag()] },
];

/** Toolbar button that lists the dashboard's keyboard and mouse shortcuts in a popover */
export const KeyboardShortcutsPopover = () => {
  const styles = useMemoCss(shortcutsStyles);
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useGeneratedHtmlId();
  const label = strings.getTitle();

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
      panelPaddingSize="none"
      hasArrow={false}
      offset={Number.parseFloat(euiTheme.size.m)}
      panelProps={{
        css: styles.panel,
        'data-test-subj': 'dashboardSelectedPanelsToolbarShortcutsPopover',
      }}
      aria-labelledby={titleId}
      button={
        <FloatingToolbarButton
          label={label}
          iconType="keyboard"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          aria-expanded={isOpen}
          data-test-subj="dashboardSelectedPanelsToolbarShortcuts"
        />
      }
    >
      <div id={titleId} css={styles.title}>
        {label}
      </div>
      <div css={styles.body}>
        {getShortcuts().map(({ label: shortcutLabel, keys }) => (
          <div key={shortcutLabel} css={styles.row}>
            <span css={styles.label}>{shortcutLabel}</span>
            <span css={styles.keys}>
              {keys.map((key) => (
                <kbd key={key} css={styles.key}>
                  {key}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </EuiPopover>
  );
};

const shortcutsStyles = {
  panel: {
    width: 269,
  },
  title: ({ euiTheme }: UseEuiTheme) => ({
    padding: euiTheme.size.m,
    fontSize: euiTheme.font.scale.s * 16,
    fontWeight: euiTheme.font.weight.semiBold,
    lineHeight: '20px',
    color: euiTheme.colors.textHeading,
    borderBottom: euiTheme.border.thin,
  }),
  body: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    padding: euiTheme.size.m,
  }),
  row: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: euiTheme.size.m,
    minHeight: euiTheme.size.l,
  }),
  label: ({ euiTheme }: UseEuiTheme) => ({
    fontSize: euiTheme.font.scale.xs * 16,
    lineHeight: euiTheme.size.l,
    color: euiTheme.colors.textParagraph,
  }),
  keys: {
    display: 'inline-flex',
    gap: 2,
    flexShrink: 0,
  },
  // matches the key caps in the workflows editor's keyboard shortcuts popover
  key: ({ euiTheme }: UseEuiTheme) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 16,
    paddingInline: 6,
    paddingBlock: 3,
    background: euiTheme.colors.emptyShade,
    border: `1px solid ${euiTheme.colors.mediumShade}`,
    borderRadius: 3,
    fontFamily: 'inherit',
    fontSize: 10,
    fontWeight: euiTheme.font.weight.medium,
    lineHeight: 1,
    color: euiTheme.colors.textSubdued,
  }),
};
