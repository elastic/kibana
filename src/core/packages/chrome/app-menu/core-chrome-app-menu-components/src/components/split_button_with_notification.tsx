/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEventHandler } from 'react';
import { EuiSplitButton, EuiIconTip, useEuiTheme, type IconType } from '@elastic/eui';
import { css, type Interpolation, type Theme } from '@emotion/react';
import {
  APP_MENU_NOTIFICATION_INDICATOR_TOP,
  APP_MENU_NOTIFICATION_INDICATOR_LEFT,
} from '../constants';

export interface SplitButtonWithNotificationProps {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  iconType?: IconType;
  isDisabled?: boolean;
  isLoading?: boolean;
  isMainButtonLoading?: boolean;
  isSelected?: boolean;
  href?: string;
  target?: string;
  id?: string;
  'data-test-subj'?: string;
  css?: Interpolation<Theme>;
  fullWidth?: boolean;
  'aria-haspopup'?: 'menu';

  secondaryButtonIcon: IconType;
  secondaryButtonAriaLabel: string;
  onSecondaryButtonClick?: React.MouseEventHandler<HTMLButtonElement>;
  isSecondaryButtonDisabled?: boolean;

  showNotificationIndicator?: boolean;
  notificationIndicatorTooltipContent?: string;
}

export const SplitButtonWithNotification = ({
  isDisabled = false,
  isLoading = false,
  'data-test-subj': dataTestSubj,
  css: cssProp,
  fullWidth,

  children,
  onClick,
  iconType,
  isMainButtonLoading = false,
  isSelected,
  href,
  target,
  id,
  'aria-haspopup': ariaHasPopup,

  secondaryButtonIcon,
  secondaryButtonAriaLabel,
  onSecondaryButtonClick,
  isSecondaryButtonDisabled,

  showNotificationIndicator = false,
  notificationIndicatorTooltipContent,
}: SplitButtonWithNotificationProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={{
        position: 'relative' as const,
        display: fullWidth ? 'block' : 'inline-block',
        padding: `0 ${euiTheme.size.s}`,
      }}
    >
      <EuiSplitButton
        color="text"
        size="s"
        isDisabled={isDisabled}
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
          data-test-subj={dataTestSubj}
          id={id}
          onClick={onClick as MouseEventHandler}
          iconType={iconType}
          iconSize="m"
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
          aria-label={secondaryButtonAriaLabel}
          onClick={onSecondaryButtonClick}
          isDisabled={isSecondaryButtonDisabled}
        />
      </EuiSplitButton>
      {showNotificationIndicator && (
        <div
          data-test-subj="split-button-notification-indicator"
          css={{
            position: 'absolute' as const,
            top: APP_MENU_NOTIFICATION_INDICATOR_TOP,
            left: APP_MENU_NOTIFICATION_INDICATOR_LEFT,
            zIndex: 1,
            pointerEvents: 'none',
            '& svg': {
              stroke: euiTheme.colors.backgroundBasePlain,
              strokeWidth: euiTheme.size.xxs,
              paintOrder: 'stroke fill',
            },
          }}
        >
          <span css={{ pointerEvents: 'auto' }}>
            <EuiIconTip
              type="dot"
              size="m"
              color="primary"
              content={notificationIndicatorTooltipContent}
              iconProps={{
                onClick:
                  isDisabled || isLoading || isMainButtonLoading
                    ? undefined
                    : (onClick as MouseEventHandler),
              }}
            />
          </span>
        </div>
      )}
    </div>
  );
};
