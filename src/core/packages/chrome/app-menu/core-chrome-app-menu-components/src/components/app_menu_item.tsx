/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEvent } from 'react';
import { EuiHeaderLink, EuiHideFor, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { upperFirst } from 'lodash';
import { css } from '@emotion/react';
import { getIsSelectedColor, getTooltip, isDisabled } from '../utils';
import { AppMenuPopover } from './app_menu_popover';
import type { AppMenuItemType } from '../types';

type AppMenuItemProps = AppMenuItemType & {
  isPopoverOpen: boolean;
  onPopoverToggle: () => void;
  onPopoverClose: () => void;
};

export const AppMenuItem = ({
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
  items,
  isPopoverOpen,
  hidden,
  popoverWidth,
  popoverTestId,
  onPopoverToggle,
  onPopoverClose,
}: AppMenuItemProps) => {
  const { euiTheme } = useEuiTheme();

  const itemText = upperFirst(label);
  const { title, content } = getTooltip({ tooltipContent, tooltipTitle });
  const showTooltip = Boolean(content || title);
  const hasItems = items && items.length > 0;

  const handleClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled(disableButton)) return;

    if (hasItems) {
      onPopoverToggle();
      return;
    }

    run?.({ triggerElement: event.currentTarget });
  };

  const buttonCss = css`
    background-color: ${isPopoverOpen
      ? getIsSelectedColor({
          color: 'text',
          euiTheme,
          isFilled: false,
        })
      : undefined};
  `;

  const buttonComponent = (
    <EuiHideFor sizes={hidden ?? 'none'}>
      <EuiHeaderLink
        onClick={href ? undefined : handleClick}
        id={htmlId}
        data-test-subj={testId || `app-menu-item-${id}`}
        iconType={iconType}
        isDisabled={isDisabled(disableButton)}
        href={href}
        target={href ? target : undefined}
        isLoading={isLoading}
        size="s"
        iconSide="left"
        iconSize="m"
        color="text"
        aria-haspopup={hasItems ? 'menu' : undefined}
        isSelected={hasItems ? isPopoverOpen : undefined}
        css={buttonCss}
      >
        {itemText}
      </EuiHeaderLink>
    </EuiHideFor>
  );

  /**
   * There is an issue with passing down a button wrapped in a tooltip to popover.
   * Because of that, popover has its own tooltip handling.
   * So we only wrap in tooltip if there are no items (no popover).
   */
  const button =
    showTooltip && !hasItems ? (
      <EuiToolTip content={content} title={title} delay="long">
        {buttonComponent}
      </EuiToolTip>
    ) : (
      buttonComponent
    );

  if (hasItems) {
    return (
      <AppMenuPopover
        items={items}
        anchorElement={button}
        tooltipContent={content}
        tooltipTitle={title}
        isOpen={isPopoverOpen}
        popoverWidth={popoverWidth}
        popoverTestId={popoverTestId}
        onClose={onPopoverClose}
      />
    );
  }

  return button;
};
