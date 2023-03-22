/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ToolbarPopover } from '../popover';
import { IconButtonGroup, ToolbarButton } from '../buttons';

/** type for cases with both button or a popover could be used */
export type ToolbarButtonType = typeof ToolbarButton | typeof ToolbarPopover;

/** Specific type for the toolbar children in its props */
interface NamedSlots {
  primaryButton: ReactElement<ToolbarButtonType>;
  iconButtonGroup?: ReactElement<typeof IconButtonGroup>;
  extraButtons?: Array<ReactElement<ToolbarButtonType>> | undefined;
}

/**
 * Props for a generic toolbar component
 */
export interface Props {
  children: NamedSlots;
}

const errorText = i18n.translate('sharedUXPackages.buttonToolbar.toolbar.errorToolbarText', {
  defaultMessage:
    'There are over 120 extra buttons. Please consider limiting the number of buttons.',
});

/**
 *
 * @param children of the toolbar such as a popover or button
 * @returns Toolbar component
 */
export const Toolbar = ({ children }: Props) => {
  const { primaryButton, iconButtonGroup, extraButtons = [] } = children;

  if (extraButtons.length > 120) {
    throw new Error(errorText);
  }

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
