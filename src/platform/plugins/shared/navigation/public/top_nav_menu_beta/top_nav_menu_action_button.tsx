/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SplitButton } from '@kbn/split-button';
import { isFunction, upperFirst } from 'lodash';
import type { MouseEvent } from 'react';
import { EuiButton } from '@elastic/eui';
import type { TopNavMenuActionItemBeta } from '../top_nav_menu/top_nav_menu_data';

interface TopNavMenuActionButtonProps extends TopNavMenuActionItemBeta {
  closePopover: () => void;
  isMobileMenu?: boolean;
}

export const TopNavMenuActionButton = ({
  run,
  htmlId,
  label,
  testId,
  iconType,
  disableButton,
  href,
  target,
  isLoading,
  color,
  splitButtonProps,
  isMobileMenu,
  closePopover,
}: TopNavMenuActionButtonProps) => {
  const itemText = upperFirst(label);
  const { run: splitButtonRun, ...otherSplitButtonProps } = splitButtonProps ?? {};

  const isDisabled = () => Boolean(isFunction(disableButton) ? disableButton() : disableButton);

  const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled()) return;

    run(e.currentTarget);

    if (isMobileMenu) {
      closePopover();
    }
  };

  const handleSecondaryButtonClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (splitButtonProps?.isSecondaryButtonDisabled) return;

    splitButtonRun?.(event.currentTarget);

    if (isMobileMenu) {
      closePopover();
    }
  };

  const commonProps = {
    onClick: href ? undefined : handleClick,
    id: htmlId,
    'data-test-subj': testId,
    iconType,
    isDisabled: isDisabled(),
    href,
    target: href ? target : undefined,
    isLoading,
    color,
    size: 's' as const,
    iconSize: 'm' as const,
    fill: false,
  };

  if (splitButtonProps) {
    return (
      <SplitButton
        {...otherSplitButtonProps}
        {...commonProps}
        secondaryButtonFill={false}
        onSecondaryButtonClick={handleSecondaryButtonClick}
        secondaryButtonIcon="arrowDown"
      >
        {itemText}
      </SplitButton>
    );
  }

  return (
    <EuiButton {...commonProps} iconSide="left">
      {itemText}
    </EuiButton>
  );
};
