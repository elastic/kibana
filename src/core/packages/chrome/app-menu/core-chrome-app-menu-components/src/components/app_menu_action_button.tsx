/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEvent } from 'react';
import { SplitButtonWithNotification } from '@kbn/split-button';
import { upperFirst } from 'lodash';
import type { EuiButtonColor, PopoverAnchorPosition } from '@elastic/eui';
import { EuiButton, EuiHideFor, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  APP_MENU_NOTIFICATION_INDICATOR_LEFT,
  APP_MENU_NOTIFICATION_INDICATOR_TOP,
} from '../constants';
import { getIsSelectedColor, getTooltip, isDisabled } from '../utils';
import { AppMenuPopover } from './app_menu_popover';
import type {
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
  AppMenuSplitButtonProps,
} from '../types';

type AppMenuActionButtonProps = (AppMenuPrimaryActionItem | AppMenuSecondaryActionItem) & {
  isPopoverOpen: boolean;
  onPopoverToggle: () => void;
  onPopoverClose: () => void;
  popoverAnchorPosition?: PopoverAnchorPosition;
  onCloseOverflowButton?: () => void;
};

export const AppMenuActionButton = (props: AppMenuActionButtonProps) => {
  const { euiTheme } = useEuiTheme();

  const {
    run,
    id,
    htmlId,
    label,
    testId,
    iconType,
    disableButton,
    href,
    target,
    isLoading,
    tooltipContent,
    tooltipTitle,
    isPopoverOpen,
    hidden,
    popoverWidth,
    popoverTestId,
    onPopoverToggle,
    onPopoverClose,
    popoverAnchorPosition,
    onCloseOverflowButton,
  } = props;

  const itemText = upperFirst(label);
  const { title, content } = getTooltip({ tooltipContent, tooltipTitle });
  const showTooltip = Boolean(content || title);

  const splitButtonProps = 'splitButtonProps' in props ? props.splitButtonProps : undefined;
  const colorProp = 'color' in props ? props.color : undefined;
  const isFilledProp = 'isFilled' in props ? props.isFilled : undefined;
  const minWidthProp = 'minWidth' in props ? props.minWidth : undefined;
  const items = 'items' in props ? props.items : undefined;

  const {
    items: splitButtonItems,
    run: splitButtonRun,
    ...otherSplitButtonProps
  } = splitButtonProps || ({} as AppMenuSplitButtonProps);

  const hasItems = items && items.length > 0;
  const hasSplitItems = splitButtonItems && splitButtonItems.length > 0;

  const handleClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled(disableButton)) return;

    if (hasItems) {
      onPopoverToggle();
      return;
    }

    run?.({ triggerElement: event.currentTarget });
  };

  const handleSecondaryButtonClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled(splitButtonProps?.isSecondaryButtonDisabled)) return;

    if (hasSplitItems) {
      onPopoverToggle();
      return;
    }

    splitButtonRun?.({ triggerElement: event.currentTarget });
  };

  const commonProps = {
    onClick: href ? undefined : handleClick,
    id: htmlId,
    'data-test-subj': testId || `app-menu-action-button-${id}`,
    iconType,
    isDisabled: isDisabled(disableButton),
    href,
    target: href ? target : undefined,
    isLoading,
    size: 's' as const,
    iconSize: 'm' as const,
  };

  // Target the split part of the button for popover behavior.
  const splitButtonCss = css`
    & + button {
      background-color: ${isPopoverOpen
        ? getIsSelectedColor({
            color: 'text',
            euiTheme,
            isFilled: false,
          })
        : undefined};
    }
  `;

  const buttonCss = css`
    background-color: ${isPopoverOpen
      ? getIsSelectedColor({
          color: colorProp as EuiButtonColor,
          euiTheme,
          isFilled: Boolean(isFilledProp),
        })
      : undefined};
  `;

  const buttonComponent = splitButtonProps ? (
    <EuiHideFor sizes={hidden ?? 'none'}>
      <SplitButtonWithNotification
        {...otherSplitButtonProps}
        {...commonProps}
        secondaryButtonFill={false}
        onSecondaryButtonClick={handleSecondaryButtonClick}
        color="text"
        aria-haspopup={hasSplitItems ? 'menu' : undefined}
        isSelected={isPopoverOpen}
        css={splitButtonCss}
        notificationIndicatorPosition={{
          top: APP_MENU_NOTIFICATION_INDICATOR_TOP,
          left: APP_MENU_NOTIFICATION_INDICATOR_LEFT,
        }}
        notificationIndicatorSize="m"
        notificationIndicatorColor="primary"
      >
        {itemText}
      </SplitButtonWithNotification>
    </EuiHideFor>
  ) : (
    <EuiHideFor sizes={hidden ?? 'none'}>
      <EuiButton
        {...commonProps}
        iconSide="left"
        aria-haspopup={hasItems ? 'menu' : undefined}
        isSelected={isPopoverOpen}
        css={buttonCss}
        color={colorProp}
        minWidth={minWidthProp}
        fill={isFilledProp}
      >
        {itemText}
      </EuiButton>
    </EuiHideFor>
  );

  /**
   * There is an issue with passing down a button wrapped in a tooltip to popover.
   * Because of that, popover has its own tooltip handling.
   * So we only wrap in tooltip if there are no items (no popover).
   */
  const button =
    showTooltip && !hasSplitItems && !hasItems ? (
      <EuiToolTip content={content} title={title} delay="long">
        {buttonComponent}
      </EuiToolTip>
    ) : (
      buttonComponent
    );

  if (hasItems || hasSplitItems) {
    return (
      <AppMenuPopover
        // For split button, only allow popover behavior on the split part of the split button.
        items={hasSplitItems ? splitButtonItems : items ?? []}
        tooltipContent={content}
        tooltipTitle={title}
        anchorElement={button}
        isOpen={isPopoverOpen}
        popoverWidth={popoverWidth}
        popoverTestId={popoverTestId}
        onClose={onPopoverClose}
        onCloseOverflowButton={onCloseOverflowButton}
        anchorPosition={popoverAnchorPosition}
      />
    );
  }

  return button;
};
