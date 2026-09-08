/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  useEuiTheme,
  EuiToolTip,
  EuiPopover,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiText,
  EuiDescriptionList,
  useGeneratedHtmlId,
  logicalCSS,
  mathWithUnits,
  euiYScroll,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isMac } from '@kbn/shared-ux-utility';

const COMMAND_KEY = isMac ? '⌘' : 'CTRL';

const shortcuts: Array<{ keys: readonly string[]; label: string }> = [
  {
    keys: [COMMAND_KEY, 'Enter'],
    label: i18n.translate('esqlEditor.query.runKeyboardShortcutsLabel', {
      defaultMessage: 'Run query',
    }),
  },
  {
    keys: ['⇧', 'Enter'],
    label: i18n.translate('esqlEditor.query.newLineKeyboardShortcutsLabel', {
      defaultMessage: 'New line',
    }),
  },
  {
    keys: [COMMAND_KEY, '/'],
    label: i18n.translate('esqlEditor.query.commentKeyboardShortcutsLabel', {
      defaultMessage: 'Comment/uncomment line',
    }),
  },
  {
    keys: [COMMAND_KEY, 'K'],
    label: i18n.translate('esqlEditor.query.openVisorKeyboardShortcutsLabel', {
      defaultMessage: 'Open quick search',
    }),
  },
  {
    keys: [COMMAND_KEY, 'I'],
    label: i18n.translate('esqlEditor.query.prettifyKeyboardShortcutsLabel', {
      defaultMessage: 'Prettify query',
    }),
  },
  {
    keys: [COMMAND_KEY, 'J'],
    label: i18n.translate('esqlEditor.query.generateFromCommentKeyboardShortcutsLabel', {
      defaultMessage: 'Generate ES|QL from comment',
    }),
  },
];

const renderShortcutKeys = (keys: readonly string[]) =>
  keys.map((key, index) => (
    <Fragment key={`${key}-${index}`}>
      {index > 0 ? ' ' : null}
      <kbd>{key}</kbd>
    </Fragment>
  ));

const toListItems = (keysFirst = true) =>
  shortcuts.map(({ keys, label: shortcutLabel }) => ({
    title: keysFirst ? renderShortcutKeys(keys) : shortcutLabel,
    description: keysFirst ? shortcutLabel : renderShortcutKeys(keys),
  }));

export interface KeyboardShortcutsProps {
  display?: 'popover' | 'inline';
}

export function KeyboardShortcuts({ display = 'popover' }: KeyboardShortcutsProps = {}) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const [isOpen, setIsOpen] = useState(false);

  const label = i18n.translate('esqlEditor.query.keyboardShortcutsLabel', {
    defaultMessage: 'Keyboard shortcuts',
  });
  const labelId = useGeneratedHtmlId();

  if (display === 'inline') {
    return (
      <EuiText size="m" data-test-subj="editorKeyboardShortcutsInline">
        <h3 id={labelId}>{label}</h3>
        <EuiDescriptionList
          aria-labelledby={labelId}
          type="column"
          columnWidths={['auto', 'auto']}
          columnGutterSize="m"
          compressed
          listItems={toListItems(false)}
        />
      </EuiText>
    );
  }

  const containerStyles = css`
    ${logicalCSS('max-height', '80vh')}
    ${logicalCSS(
      'max-width',
      mathWithUnits(euiTheme.size.xxl, (x) => x * 10)
    )}
    padding: ${euiTheme.size.m};
    ${euiYScroll(euiThemeContext)}

    .euiDescriptionList {
      row-gap: 0; /* Row spacing handled by default EuiText dd/dt styles */
    }
  `;
  return (
    <>
      <EuiPopover
        aria-labelledby={labelId}
        data-test-subj="editorKeyboardShortcutsPopover"
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="none"
        button={
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              size="xs"
              iconType="keyboard"
              data-test-subj="editorKeyboardShortcutsButton"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={label}
              color="text"
            />
          </EuiToolTip>
        }
      >
        <EuiPopoverTitle paddingSize="s">
          <h2 id={labelId}>{label}</h2>
        </EuiPopoverTitle>
        <EuiText css={containerStyles} className="keyboardShortcuts" size="xs">
          <EuiDescriptionList
            aria-labelledby={labelId}
            type="column"
            columnWidths={['auto', 'auto']}
            align="center"
            compressed
            listItems={toListItems()}
          />
        </EuiText>
      </EuiPopover>
    </>
  );
}
