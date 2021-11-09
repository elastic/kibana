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

import { SolutionToolbarButton, Props as ButtonProps } from './button';

type AllowedButtonProps = Omit<ButtonProps, 'onClick' | 'fill'>;
type AllowedPopoverProps = Omit<
  EuiPopoverProps,
  'button' | 'isOpen' | 'closePopover' | 'anchorPosition'
>;

export type Props = AllowedButtonProps &
  AllowedPopoverProps & {
    children: (arg: { closePopover: () => void }) => React.ReactNode;
  };

export const SolutionToolbarPopover = ({
  label,
  iconType,
  primary,
  iconSide,
  children,
  ...popover
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const onButtonClick = () => setIsOpen((status) => !status);
  const closePopover = () => setIsOpen(false);

  const button = (
    <SolutionToolbarButton
      {...{ label, iconType, primary, iconSide }}
      onClick={onButtonClick}
      data-test-subj={popover['data-test-subj']}
    />
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      panelPaddingSize="none"
      {...{ isOpen, button, closePopover }}
      {...popover}
    >
      {children({ closePopover })}
    </EuiPopover>
  );
};
