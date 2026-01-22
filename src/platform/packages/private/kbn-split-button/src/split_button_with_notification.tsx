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
  EuiIconTip,
  euiButtonSizeMap,
  useEuiTheme,
  type IconColor,
  type IconSize,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { SplitButton, type SplitButtonProps } from './split_button';

export type SplitButtonWithNotificationProps = SplitButtonProps & {
  showNotificationIndicator?: boolean;
  notificationIndicatorColor?: IconColor;
  notificationIndicatorSize?: IconSize;
  notifcationIndicatorTooltipContent?: string;
  notificationIndicatorPosition?: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  };
  notificationIndicatorHasStroke?: boolean;
};

export const SplitButtonWithNotification = ({
  showNotificationIndicator = false,
  notificationIndicatorColor = 'primary',
  notificationIndicatorSize = 'l',
  notifcationIndicatorTooltipContent,
  notificationIndicatorPosition,
  notificationIndicatorHasStroke = true,
  ...splitButtonProps
}: SplitButtonWithNotificationProps) => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemoCss(componentStyles);

  /**
   * Calculate indicator position based on secondary button size
   * Secondary button is an icon button and they are square, so we use height as the width
   * as width isn't directly available
   * */
  const size = splitButtonProps?.size ?? 'm';
  const buttonSizes = euiButtonSizeMap(euiThemeContext);
  const secondaryButtonWidth = buttonSizes[size]?.height;

  const disableIndicatorOnClick = splitButtonProps?.isDisabled || splitButtonProps?.isLoading;

  return (
    <div css={styles.buttonWrapper}>
      <SplitButton {...splitButtonProps} />
      {showNotificationIndicator && (
        <div
          data-test-subj="split-button-notification-indicator"
          css={{
            position: 'absolute' as const,
            top: notificationIndicatorPosition?.top ?? -10,
            right: notificationIndicatorPosition?.right ?? secondaryButtonWidth,
            left: notificationIndicatorPosition?.left,
            bottom: notificationIndicatorPosition?.bottom,
            zIndex: 1,
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
                onClick: disableIndicatorOnClick
                  ? undefined
                  : (splitButtonProps?.onClick as MouseEventHandler<SVGElement> | undefined),
              }}
            />
          </span>
        </div>
      )}
    </div>
  );
};

const componentStyles = {
  buttonWrapper: {
    position: 'relative' as const,
    display: 'inline-block' as const,
  },
};
