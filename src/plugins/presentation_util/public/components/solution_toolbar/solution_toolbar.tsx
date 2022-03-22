/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

/** @deprecated QuickButtonGroup  - use `IconButtonGroup` from `@kbn/shared-ux-components */
import {
  QuickButtonGroup,
  PrimaryActionButton,
  SolutionToolbarButton,
  PrimaryActionPopover,
  SolutionToolbarPopover,
} from './items';

import './solution_toolbar.scss';

interface NamedSlots {
  primaryActionButton: ReactElement<typeof PrimaryActionButton | typeof PrimaryActionPopover>;
  quickButtonGroup?: ReactElement<typeof QuickButtonGroup>;
  extraButtons?: Array<
    ReactElement<typeof SolutionToolbarButton | typeof SolutionToolbarPopover> | undefined
  >;
}

export interface Props {
  isDarkModeEnabled?: boolean;
  children: NamedSlots;
}

export const SolutionToolbar = ({ isDarkModeEnabled, children }: Props) => {
  const { primaryActionButton, quickButtonGroup, extraButtons = [] } = children;

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
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
          {quickButtonGroup ? <EuiFlexItem grow={false}>{quickButtonGroup}</EuiFlexItem> : null}
          {extra}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
