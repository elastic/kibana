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

interface ShortcutsPopoverProps {
  button: any;
  isOpen: boolean;
  closePopover: () => void;
}

export const ShortcutsPopover = ({ button, isOpen, closePopover }: ShortcutsPopoverProps) => {
  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={closePopover}>
      <EuiTitle size="xxs">
        <h5>Navigation shortcuts</h5>
      </EuiTitle>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Collapse all scopes except current"
          keys={['Ctrl', 'Option', 'O']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Collapse or expand current scope"
          keys={['Ctrl', 'Alt', 'L']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Expand all scopes"
          keys={['Shift', 'Ctrl', 'Option', 'O']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Go to line number"
          keys={['Ctrl', 'L', 'Option', 'O']}
        />
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiTitle size="xxs">
        <h5>Request shortcuts</h5>
      </EuiTitle>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Auto-indent current request"
          keys={['Ctrl', 'I']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Jump to next request"
          keys={['Ctrl', 'down']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Jump to previous request"
          keys={['Ctrl', 'up']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Open documentation for current request"
          keys={['Ctrl', '/']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Run current request"
          keys={['Ctrl', 'Enter']}
        />
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiTitle size="xxs">
        <h5>Autocomplete menu shortcuts</h5>
      </EuiTitle>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="s" direction="column">
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Apply current or topmost term in menu"
          keys={['Enter']}
          alternativeKeys={['Tab']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Close autocomplete menu"
          keys={['Esc']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Navigate items in autocomplete menu"
          keys={['down', 'up']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Open autocomplete menu"
          keys={['Ctrl', 'Space']}
        />
        <ShortcutLineFlexItem
          id="collapseAllExceptCurrent"
          description="Switch focus to autocomplete menu"
          keys={['Ctrl', 'down']}
        />
      </EuiFlexGroup>
    </EuiPopover>
  );
};
