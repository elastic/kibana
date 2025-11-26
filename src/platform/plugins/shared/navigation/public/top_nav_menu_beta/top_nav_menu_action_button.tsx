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
import { TopNavPopover } from './top_nav_popover';

type TopNavMenuActionButtonProps =
  | TopNavMenuPrimaryActionItemBeta
  | TopNavMenuSecondaryActionItemBeta;

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
    tooltip,
    items,
  } = props;
  const itemText = upperFirst(label);

  const splitButtonProps = 'splitButtonProps' in props ? props.splitButtonProps : undefined;
  const colorProp = 'color' in props ? props.color : undefined;
  const [isMainPopoverOpen, setIsMainPopoverOpen] = React.useState(false);
  const [isSplitPopoverOpen, setIsSplitPopoverOpen] = React.useState(false);

  const splitButtonItems = splitButtonProps?.items;
  const hasMainItems = items && items.length > 0;
  const hasSplitItems = splitButtonItems && splitButtonItems.length > 0;

  const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled(disableButton)) return;

    if (hasMainItems) {
      setIsMainPopoverOpen(!isMainPopoverOpen);
      return;
    }

    run();
  };

  const handleSecondaryButtonClick = () => {
    if (splitButtonProps?.isSecondaryButtonDisabled) return;

    if (hasSplitItems) {
      setIsSplitPopoverOpen(!isSplitPopoverOpen);
      return;
    }

    splitButtonProps?.run?.();
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

  const buttonWithTooltip = tooltipContent ? (
    <EuiToolTip content={tooltipContent}>{button}</EuiToolTip>
  ) : (
    button
  );

  // Handle both main items and split button items - wrap in separate popovers if needed
  let result = buttonWithTooltip;

  // First wrap with main items popover (if exists)
  if (hasMainItems) {
    result = (
      <TopNavPopover
        items={items}
        anchorElement={result}
        isOpen={isMainPopoverOpen}
        onToggle={() => setIsMainPopoverOpen(!isMainPopoverOpen)}
        onClose={() => setIsMainPopoverOpen(false)}
      />
    );
  }

  // Then wrap with split button items popover (if exists)
  if (hasSplitItems) {
    result = (
      <TopNavPopover
        items={splitButtonItems}
        anchorElement={result}
        isOpen={isSplitPopoverOpen}
        onToggle={() => setIsSplitPopoverOpen(!isSplitPopoverOpen)}
        onClose={() => setIsSplitPopoverOpen(false)}
      />
    );
  }

  return result;
};
