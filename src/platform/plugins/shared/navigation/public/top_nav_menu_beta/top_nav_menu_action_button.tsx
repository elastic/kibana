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
import { upperFirst } from 'lodash';
import type { MouseEvent } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { getTooltip, isDisabled } from './utils';
import type {
  TopNavMenuPrimaryActionItemBeta,
  TopNavMenuSecondaryActionItemBeta,
  TopNavMenuSplitButtonProps,
} from './types';

type TopNavMenuActionButtonProps = (
  | TopNavMenuPrimaryActionItemBeta
  | TopNavMenuSecondaryActionItemBeta
) & {
  closePopover: () => void;
  isMobileMenu?: boolean;
};

export const TopNavMenuActionButton = (props: TopNavMenuActionButtonProps) => {
  const {
    run,
    htmlId,
    label,
    testId,
    iconType,
    disableButton,
    href,
    target,
    isLoading,
    isMobileMenu,
    tooltip,
    closePopover,
  } = props;
  const itemText = upperFirst(label);

  const splitButtonProps = 'splitButtonProps' in props ? props.splitButtonProps : undefined;
  const colorProp = 'color' in props ? props.color : undefined;

  const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled(disableButton)) return;

    run(e.currentTarget);

    if (isMobileMenu) {
      closePopover();
    }
  };

  const handleSecondaryButtonClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (splitButtonProps?.isSecondaryButtonDisabled) return;

    splitButtonProps?.run?.(event.currentTarget);

    if (isMobileMenu) {
      closePopover();
    }
  };

  const commonProps = {
    onClick: href ? undefined : handleClick,
    id: htmlId,
    'data-test-subj': testId,
    iconType,
    isDisabled: isDisabled(disableButton),
    href,
    target: href ? target : undefined,
    isLoading,
    size: 's' as const,
    iconSize: 'm' as const,
    fullWidth: isMobileMenu,
  };

  const button = splitButtonProps ? (
    <SplitButton
      {...(splitButtonProps as TopNavMenuSplitButtonProps)}
      {...commonProps}
      secondaryButtonFill={false}
      onSecondaryButtonClick={handleSecondaryButtonClick}
      color="text"
    >
      {itemText}
    </SplitButton>
  ) : (
    <EuiButton {...commonProps} iconSide="left" color={colorProp}>
      {itemText}
    </EuiButton>
  );

  const tooltipContent = getTooltip(tooltip);

  if (tooltipContent) {
    return <EuiToolTip content={tooltipContent}>{button}</EuiToolTip>;
  }

  return button;
};
