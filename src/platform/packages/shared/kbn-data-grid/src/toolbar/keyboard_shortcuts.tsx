/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarIconButton } from './toolbar_control_button';

const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iP(hone|od|ad)/.test(navigator.platform);

const getShortcuts = () => {
  const modifier = isMac() ? 'Cmd' : 'Ctrl';
  return [
    {
      keys: i18n.translate('kbnDataGrid.keyboardShortcuts.upArrow', { defaultMessage: 'Up arrow' }),
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.upArrowDescription', {
        defaultMessage: 'Move one cell up',
      }),
    },
    {
      keys: i18n.translate('kbnDataGrid.keyboardShortcuts.downArrow', {
        defaultMessage: 'Down arrow',
      }),
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.downArrowDescription', {
        defaultMessage: 'Move one cell down',
      }),
    },
    {
      keys: i18n.translate('kbnDataGrid.keyboardShortcuts.rightArrow', {
        defaultMessage: 'Right arrow',
      }),
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.rightArrowDescription', {
        defaultMessage: 'Move one cell right',
      }),
    },
    {
      keys: i18n.translate('kbnDataGrid.keyboardShortcuts.leftArrow', {
        defaultMessage: 'Left arrow',
      }),
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.leftArrowDescription', {
        defaultMessage: 'Move one cell left',
      }),
    },
    {
      keys: 'Home',
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.homeDescription', {
        defaultMessage: 'Move to the first cell of the current row',
      }),
    },
    {
      keys: 'End',
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.endDescription', {
        defaultMessage: 'Move to the last cell of the current row',
      }),
    },
    {
      keys: 'Ctrl + Home',
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.ctrlHomeDescription', {
        defaultMessage: 'Move to the first cell of the grid',
      }),
    },
    {
      keys: 'Ctrl + End',
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.ctrlEndDescription', {
        defaultMessage: 'Move to the last cell of the grid',
      }),
    },
    {
      keys: 'Enter',
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.enterDescription', {
        defaultMessage: 'Open cell details and actions',
      }),
    },
    {
      keys: 'Escape',
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.escapeDescription', {
        defaultMessage: 'Close cell details and actions',
      }),
    },
    {
      keys: `${modifier} + C`,
      description: i18n.translate('kbnDataGrid.keyboardShortcuts.copyDescription', {
        defaultMessage: 'Copy the focused cell value',
      }),
    },
  ];
};

const PANEL_STYLE = { width: 480, maxWidth: '90vw' } as const;

export const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);
  const title = i18n.translate('kbnDataGrid.keyboardShortcuts.title', {
    defaultMessage: 'Keyboard shortcuts',
  });

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      panelStyle={PANEL_STYLE}
      aria-label={title}
      button={
        <ToolbarIconButton
          iconType="keyboard"
          aria-label={title}
          data-test-subj="dataGridKeyboardShortcutsButton"
          onClick={() => setIsOpen((open) => !open)}
        />
      }
    >
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      <EuiBasicTable
        compressed
        tableCaption={title}
        items={getShortcuts()}
        columns={[
          {
            field: 'keys',
            name: i18n.translate('kbnDataGrid.keyboardShortcuts.keys', { defaultMessage: 'Keys' }),
            render: (keys: string) => <kbd>{keys}</kbd>,
          },
          {
            field: 'description',
            name: i18n.translate('kbnDataGrid.keyboardShortcuts.action', {
              defaultMessage: 'Action',
            }),
          },
        ]}
      />
    </EuiPopover>
  );
};
