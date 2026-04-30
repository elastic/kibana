/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEventHandler } from 'react';
import {
  EuiSplitButton,
  EuiIconTip,
  euiButtonSizeMap,
  useEuiTheme,
  type EuiButtonProps,
  type IconColor,
  type IconSize,
  type IconType,
} from '@elastic/eui';
import { css, type Interpolation, type Theme } from '@emotion/react';

export interface SplitButtonWithNotificationProps {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  iconType?: IconType;
  iconSize?: EuiButtonProps['iconSize'];
  isDisabled?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  isMainButtonLoading?: boolean;
  isMainButtonDisabled?: boolean;
  isSelected?: boolean;
  color?: EuiButtonProps['color'];
  size?: EuiButtonProps['size'];
  href?: string;
  target?: string;
  id?: string;
  'data-test-subj'?: string;
  css?: Interpolation<Theme>;
  fullWidth?: boolean;
  'aria-haspopup'?: 'menu';

  secondaryButtonIcon: IconType;
  secondaryButtonAriaLabel?: string;
  secondaryButtonTitle?: string;
  onSecondaryButtonClick?: React.MouseEventHandler<HTMLButtonElement>;
  isSecondaryButtonLoading?: boolean;
  isSecondaryButtonDisabled?: boolean;
  /** @deprecated Ignored — EuiSplitButton manages fill state uniformly. Kept for type compatibility. */
  secondaryButtonFill?: boolean;

  showNotificationIndicator?: boolean;
  notificationIndicatorColor?: IconColor;
  notificationIndicatorSize?: IconSize;
  /** @note Intentional typo kept for backwards compatibility */
  notifcationIndicatorTooltipContent?: string;
  notificationIndicatorPosition?: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  };
  notificationIndicatorHasStroke?: boolean;
}

export const SplitButtonWithNotification = ({
  color = 'primary',
  size = 'm',
  disabled = false,
  isDisabled = false,
  isLoading = false,
  'data-test-subj': dataTestSubj,
  css: cssProp,
  fullWidth,

  children,
  onClick,
  iconType,
  iconSize,
  isMainButtonLoading = false,
  isMainButtonDisabled = false,
  isSelected,
  href,
  target,
  id,
  'aria-haspopup': ariaHasPopup,

  secondaryButtonIcon,
  secondaryButtonAriaLabel,
  secondaryButtonTitle,
  onSecondaryButtonClick,
  isSecondaryButtonLoading,
  isSecondaryButtonDisabled,

  showNotificationIndicator = false,
  notificationIndicatorColor = 'primary',
  notificationIndicatorSize = 'l',
  notifcationIndicatorTooltipContent,
  notificationIndicatorPosition,
  notificationIndicatorHasStroke = true,
}: SplitButtonWithNotificationProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const buttonSizes = euiButtonSizeMap(euiThemeContext);
  const secondaryButtonWidth = buttonSizes[size]?.height;

  const isEffectivelyDisabled = disabled || isDisabled;
  const disableIndicatorOnClick = isEffectivelyDisabled || isLoading;

  return (
    <div
      css={{
        position: 'relative' as const,
        display: fullWidth ? 'block' : 'inline-block',
        padding: `0 ${euiTheme.size.s}`,
      }}
    >
      <EuiSplitButton
        data-test-subj={dataTestSubj}
        color={color}
        size={size}
        isDisabled={isEffectivelyDisabled}
        isLoading={isLoading}
        css={[
          fullWidth &&
            css`
              display: flex;
              width: 100%;
            `,
          cssProp,
        ]}
      >
        <EuiSplitButton.ActionPrimary
          id={id}
          onClick={onClick as MouseEventHandler}
          iconType={iconType}
          iconSize={iconSize}
          isDisabled={isMainButtonDisabled}
          isLoading={isMainButtonLoading}
          isSelected={isSelected}
          href={href}
          target={target}
          fullWidth={fullWidth}
          aria-haspopup={ariaHasPopup}
        >
          {children}
        </EuiSplitButton.ActionPrimary>
        <EuiSplitButton.ActionSecondary
          data-test-subj={dataTestSubj ? `${dataTestSubj}-secondary-button` : undefined}
          iconType={secondaryButtonIcon}
          aria-label={secondaryButtonAriaLabel ?? ''}
          title={secondaryButtonTitle}
          onClick={onSecondaryButtonClick}
          isDisabled={isSecondaryButtonDisabled}
          isLoading={isSecondaryButtonLoading}
        />
      </EuiSplitButton>
      {showNotificationIndicator && (
        <div
          data-test-subj="split-button-notification-indicator"
          css={{
            position: 'absolute' as const,
            top: notificationIndicatorPosition?.top ?? -10,
            right: notificationIndicatorPosition?.right ?? secondaryButtonWidth,
            left: notificationIndicatorPosition?.left,
            bottom: notificationIndicatorPosition?.bottom,
            zIndex: euiTheme.levels.flyout,
            pointerEvents: 'none',
            ...(notificationIndicatorHasStroke && {
              '& svg': {
                stroke: 'white',
                strokeWidth: '2px',
                paintOrder: 'stroke fill',
              },
            }),
          }}
        >
          <span css={{ pointerEvents: 'auto' }}>
            <EuiIconTip
              type="dot"
              size={notificationIndicatorSize}
              color={notificationIndicatorColor}
              content={notifcationIndicatorTooltipContent}
              iconProps={{
                onClick: disableIndicatorOnClick ? undefined : (onClick as MouseEventHandler),
              }}
            />
          </span>
        </div>
      )}
    </div>
  );
};
