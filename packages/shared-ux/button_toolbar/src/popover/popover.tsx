/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiPopover } from '@elastic/eui';
import { Props as EuiPopoverProps } from '@elastic/eui/src/components/popover/popover';

import { PrimaryButton, Props as ButtonProps } from '../buttons/primary/primary';

type AllowedButtonProps = Omit<ButtonProps, 'onClick' | 'fill'>;
type AllowedPopoverProps = Omit<
  EuiPopoverProps,
  'button' | 'isOpen' | 'closePopover' | 'anchorPosition'
>;

/**
 * Props for `ToolbarPopover`.
 */
export type Props = AllowedButtonProps &
  AllowedPopoverProps & {
    children: (arg: { closePopover: () => void }) => React.ReactNode;
  };

/**
 * A button which opens a popover of additional actions within the toolbar.
 */
export const ToolbarPopover = ({ label, iconType, children, iconSide, ...popover }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const onButtonClick = () => setIsOpen((status) => !status);
  const closePopover = () => setIsOpen(false);

  const button = <PrimaryButton onClick={onButtonClick} {...{ label, iconSide, iconType }} />;

  return (
    // the following ts-ignore is needed until typings/* directory is exposed for consumption to packages
    // @ts-ignore Types of property css are incompatible Type 'InterpolationWithTheme<any>' is not assignable to type 'Interpolation<Theme>'.
    <EuiPopover {...{ isOpen, button, closePopover }} {...popover}>
      {children({ closePopover })}
    </EuiPopover>
  );
};
