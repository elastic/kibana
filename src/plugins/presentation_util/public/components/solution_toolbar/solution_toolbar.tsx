/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';
import { AddFromLibraryButton } from './items/add_from_library';
import { SolutionToolbarButton } from './items/button';
import { SolutionToolbarPopover } from './items/popover';
import { PrimaryActionButton } from './items/primary_button';
import { PrimaryActionPopover } from './items/primary_popover';
import { QuickButtonGroup } from './items/quick_group';
import './solution_toolbar.scss';

interface NamedSlots {
  primaryActionButton: ReactElement<typeof PrimaryActionButton | typeof PrimaryActionPopover>;
  quickButtonGroup?: ReactElement<typeof QuickButtonGroup>;
  addFromLibraryButton?: ReactElement<typeof AddFromLibraryButton>;
  extraButtons?: Array<ReactElement<typeof SolutionToolbarButton | typeof SolutionToolbarPopover>>;
}

export interface Props {
  isDarkModeEnabled?: boolean;
  children: NamedSlots;
}

export const SolutionToolbar = ({ isDarkModeEnabled, children }: Props) => {
  const {
    primaryActionButton,
    quickButtonGroup,
    addFromLibraryButton,
    extraButtons = [],
  } = children;

  const extra = extraButtons.map((button, index) =>
    button ? (
      <EuiFlexItem grow={false} key={`button-${index}`}>
        {button}
      </EuiFlexItem>
    ) : null
  );

  return (
    <EuiFlexGroup
      className={`solutionToolbar ${
        isDarkModeEnabled ? 'solutionToolbar--dark' : 'solutionToolbar--light'
      }`}
      id={`kbnPresentationToolbar__solutionToolbar`}
      gutterSize="s"
    >
      <EuiFlexItem grow={false}>{primaryActionButton}</EuiFlexItem>
      {quickButtonGroup ? <EuiFlexItem grow={false}>{quickButtonGroup}</EuiFlexItem> : null}
      {extra}
      {addFromLibraryButton ? <EuiFlexItem grow={false}>{addFromLibraryButton}</EuiFlexItem> : null}
    </EuiFlexGroup>
  );
};
