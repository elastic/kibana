/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { IconButtonGroup, PrimaryButton } from '../buttons';
import { ToolbarPopover } from '../popover';

/** type for cases with both button or a popover could be used */
export type Button =  typeof PrimaryButton | typeof ToolbarPopover;

/** Specific type for the toolbar children in its props */
interface NamedSlots {
  primaryButton: ReactElement<Button>;
  iconButtonGroup?: ReactElement<typeof IconButtonGroup>;
  extraButtons?: Array<Button> | undefined;
}

/**
 * Props for a generic toolbar component
 */
export interface Props {
  children: NamedSlots;
}

/**
 *
 * @param children of the toolbar such as a popover or button
 * @returns Toolbar component
 */
export const Toolbar = ({ children }: Props) => {
  const { primaryButton, iconButtonGroup, extraButtons = [] } = children;

  const extra = extraButtons.map((button, index) =>
    button ? (
      <EuiFlexItem grow={false} key={`button-${index}`}>
        {button}
      </EuiFlexItem>
    ) : null
  );

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>{primaryButton}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup wrap={true} responsive={false} alignItems="center" gutterSize="xs">
          {iconButtonGroup ? <EuiFlexItem grow={false}>{iconButtonGroup}</EuiFlexItem> : null}
          {extra}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
