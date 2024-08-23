/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiTitle, EuiHorizontalRule, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
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
    >
      <EuiTitle size="xxs">
        <h5>Navigation shortcuts</h5>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Collapse all scopes except current"
          keys={[KEYS.keyCtrl, KEYS.keyOption, KEYS.keyO]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Collapse or expand current scope"
          keys={[KEYS.keyCtrl, KEYS.keyAlt, KEYS.keyL]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Expand all scopes"
          keys={[KEYS.keyShift, KEYS.keyCtrl, KEYS.keyOption, KEYS.keyO]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Go to line number"
          keys={[KEYS.keyCtrl, KEYS.keyL, KEYS.keyOption, KEYS.keyO]}
        />
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiTitle size="xxs">
        <h5>Request shortcuts</h5>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Auto-indent current request"
          keys={[KEYS.keyCtrl, KEYS.keyI]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Jump to next request"
          keys={[KEYS.keyCtrl, KEYS.keyDown]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Jump to previous request"
          keys={[KEYS.keyCtrl, KEYS.keyUp]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Open documentation for current request"
          keys={[KEYS.keyCtrl, KEYS.keySlash]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Run current request"
          keys={[KEYS.keyCtrl, KEYS.keyEnter]}
        />
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiTitle size="xxs">
        <h5>Autocomplete menu shortcuts</h5>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Apply current or topmost term in menu"
          keys={[KEYS.keyEnter]}
          alternativeKeys={[KEYS.keyTab]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Close autocomplete menu"
          keys={[KEYS.keyEsc]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Navigate items in autocomplete menu"
          keys={[KEYS.keyDown, KEYS.keyUp]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Open autocomplete menu"
          keys={[KEYS.keyCtrl, KEYS.keySpace]}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Switch focus to autocomplete menu"
          keys={[KEYS.keyCtrl, KEYS.keyDown]}
        />
      </EuiFlexGroup>
    </EuiPopover>
  );
};
