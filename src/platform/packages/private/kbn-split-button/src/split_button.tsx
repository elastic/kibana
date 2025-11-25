/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiButtonIcon, EuiIconTip, useEuiTheme } from '@elastic/eui';
import type { EuiButtonProps, IconColor, IconType, UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
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

  showNotificationIndicator?: boolean;
  notificationIndicatorColor?: IconColor;
  notifcationIndicatorTooltipContent?: string;
};

export const SplitButton = ({
  // Common props
  isDisabled = false,
  disabled = false,
  isLoading = false,
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

  // Notification indicator props
  showNotificationIndicator = false,
  notificationIndicatorColor,
  notifcationIndicatorTooltipContent,

  ...mainButtonProps
}: SplitButtonProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();

  const hasTransparentBorder = color !== 'text';
  const borderColor = hasTransparentBorder ? 'transparent' : euiTheme.colors.borderBasePlain;

  const areButtonsDisabled = disabled || isDisabled;

  const commonMainButtonProps: EuiButtonProps = {
    css: styles.mainButton,
    style: {
      borderRightColor: borderColor,
    },
    color,
    size,
    isDisabled: areButtonsDisabled || isMainButtonDisabled,
    isLoading: isLoading || isMainButtonLoading,
    ...mainButtonProps,
    'data-test-subj': mainButtonProps['data-test-subj'],
  };

  return (
    <div
      data-test-subj={mainButtonProps['data-test-subj'] + '-container'}
      css={[styles.container, hasTransparentBorder && styles.containerWithGap]}
    >
      <div css={styles.mainButtonWrapper}>
        {showNotificationIndicator && !iconOnly && (
          <EuiIconTip
            anchorProps={{ css: styles.notificationIndicator }}
            type="dot"
            iconProps={{ color: notificationIndicatorColor || euiTheme.colors.primary }}
            size="l"
            data-test-subj="split-button-notification-indicator"
            content={notifcationIndicatorTooltipContent}
          />
        )}
        {iconOnly && iconType ? (
          <EuiButtonIcon iconType={iconType} {...commonMainButtonProps} />
        ) : (
          <EuiButton iconType={iconType} {...commonMainButtonProps} />
        )}
      </div>
      <EuiButtonIcon
        css={styles.secondaryButton}
        data-test-subj={mainButtonProps['data-test-subj'] + `-secondary-button`}
        aria-label={secondaryButtonAriaLabel}
        display={secondaryButtonFill ? 'fill' : 'base'}
        title={secondaryButtonTitle}
        color={color}
        size={size}
        iconType={secondaryButtonIcon}
        onClick={onSecondaryButtonClick}
        isDisabled={areButtonsDisabled || isSecondaryButtonDisabled}
        isLoading={isLoading || isSecondaryButtonLoading}
      />
    </div>
  );
};

const componentStyles = {
  container: {
    display: 'flex',
  },
  containerWithGap: {
    gap: '1px',
  },
  mainButtonWrapper: {
    position: 'relative' as const,
  },
  mainButton: ({ euiTheme }: UseEuiTheme) => {
    return {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      borderRight: `${euiTheme.border.thin} solid`,
    };
  },
  secondaryButton: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: 'none',
  },
  notificationIndicator: {
    position: 'absolute' as const,
    top: '-10px',
    right: '-2px',
    zIndex: 1,
  },
};
