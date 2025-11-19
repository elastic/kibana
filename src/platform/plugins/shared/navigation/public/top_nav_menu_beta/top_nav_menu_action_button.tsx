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
  label,
  disableButton,
  isMobileMenu,
  href,
  splitButtonProps,
  htmlId,
  testId,
  isLoading,
  target,
  run,
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
    size: 's' as const,
    onClick: href ? undefined : handleClick,
    isDisabled: isDisabled(),
    id: htmlId,
    'data-test-subj': testId,
    isLoading,
    fill: false,
    color: 'text' as const,
    href,
    target: href ? target : undefined,
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
