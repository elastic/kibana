/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiButton, EuiSplitButton } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import React from 'react';

export type SplitButtonProps = React.ComponentProps<typeof EuiButton> & {
  isMainButtonLoading?: boolean;
  isMainButtonDisabled?: boolean;
  iconOnly?: boolean;

  isSecondaryButtonLoading?: boolean;
  isSecondaryButtonDisabled?: boolean;
  secondaryButtonIcon: IconType;
  secondaryButtonAriaLabel?: string;
  secondaryButtonTitle?: string;
  secondaryButtonFill?: boolean;
  onSecondaryButtonClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export const SplitButton = ({
  // Common props
  isDisabled,
  disabled,
  isLoading,
  color = 'primary',
  size = 'm',

  // Secondary button props
  isSecondaryButtonLoading = false,
  isSecondaryButtonDisabled = false,
  secondaryButtonIcon,
  secondaryButtonAriaLabel,
  secondaryButtonTitle,
  secondaryButtonFill,
  onSecondaryButtonClick,

  // Primary button props
  isMainButtonLoading = false,
  isMainButtonDisabled = false,
  iconOnly = false,
  iconType,
  ...mainButtonProps
}: SplitButtonProps) => {
  const areButtonsDisabled = disabled || isDisabled;

  return (
    <EuiSplitButton
      color={color}
      size={size}
      fill={mainButtonProps.fill || secondaryButtonFill}
      isDisabled={areButtonsDisabled}
      isLoading={isLoading}
      data-test-subj={mainButtonProps['data-test-subj'] + '-container'}
    >
      <EuiSplitButton.ActionPrimary
        isDisabled={isMainButtonDisabled}
        isLoading={isMainButtonLoading}
        isIconOnly={iconOnly}
        iconType={iconType}
        data-test-subj={mainButtonProps['data-test-subj']}
        {...mainButtonProps}
      />
      <EuiSplitButton.ActionSecondary
        data-test-subj={mainButtonProps['data-test-subj'] + `-secondary-button`}
        title={secondaryButtonTitle}
        aria-label={secondaryButtonAriaLabel}
        iconType={secondaryButtonIcon}
        onClick={onSecondaryButtonClick}
        isDisabled={areButtonsDisabled || isSecondaryButtonDisabled}
        isLoading={isSecondaryButtonLoading}
      />
    </EuiSplitButton>
  );
};
