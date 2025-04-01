/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPopover, EuiTitle, EuiHorizontalRule, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ShortcutLineFlexItem } from './shortcut_line';
import { KEYS } from './keys';

interface ShortcutsPopoverProps {
  button: any;
  isOpen: boolean;
  closePopover: () => void;
}

export const ShortcutsPopover = ({ button, isOpen, closePopover }: ShortcutsPopoverProps) => {
  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      data-test-subj="consoleShortcutsPopover"
    >
      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('console.shortcuts.navigationShortcutsSubtitle', {
            defaultMessage: 'Navigation shortcuts',
          })}
        </h5>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="goToLineNumber"
          description="Go to line number"
          keys={[KEYS.keyCtrlCmd, KEYS.keyL]}
        />
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('console.shortcuts.requestShortcutsSubtitle', {
            defaultMessage: 'Request shortcuts',
          })}
        </h5>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="autoindentCurrentRequest"
          description="Auto-indent current request"
          keys={[KEYS.keyCtrlCmd, KEYS.keyI]}
        />
        <ShortcutLineFlexItem
          id="jumpToNextRequestEnd"
          description="Jump to next request end"
          keys={[KEYS.keyCtrlCmd, KEYS.keyDown]}
        />
        <ShortcutLineFlexItem
          id="jumpToPreviousRequestEnd"
          description="Jump to previous request end"
          keys={[KEYS.keyCtrlCmd, KEYS.keyUp]}
        />
        <ShortcutLineFlexItem
          id="openDocumentation"
          description="Open documentation for current request"
          keys={[KEYS.keyCtrlCmd, KEYS.keySlash]}
        />
        <ShortcutLineFlexItem
          id="runRequest"
          description="Run current request"
          keys={[KEYS.keyCtrlCmd, KEYS.keyEnter]}
        />
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('console.shortcuts.autocompleteShortcutsSubtitle', {
            defaultMessage: 'Autocomplete menu shortcuts',
          })}
        </h5>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="applyCurrentAutocompleteSuggestion"
          description="Apply current or topmost term in menu"
          keys={[KEYS.keyEnter]}
          alternativeKeys={[KEYS.keyTab]}
        />
        <ShortcutLineFlexItem
          id="closeAutocompleteMenu"
          description="Close autocomplete menu"
          keys={[KEYS.keyEsc]}
        />
        <ShortcutLineFlexItem
          id="navigateAutocompleteMenu"
          description="Navigate items in autocomplete menu"
          keys={[KEYS.keyDown]}
          alternativeKeys={[KEYS.keyUp]}
        />
      </EuiFlexGroup>
    </EuiPopover>
  );
};
