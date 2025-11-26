/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import { upperFirst } from 'lodash';
import { getTooltip, isDisabled } from './utils';
import type { TopNavMenuItemBetaType } from './types';
import { TopNavPopover } from './top_nav_popover';

export const TopNavMenuItemBeta = ({
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
}: TopNavMenuItemBetaType) => {
  const itemText = upperFirst(label);

  const handleClick = () => {
    if (isDisabled(disableButton)) return;

    if (items && items.length > 0) {
      return;
    }

    run();
  };

  const tooltipContent = getTooltip(tooltip);

  const button = (
    <EuiHeaderLink
      onClick={href ? undefined : handleClick}
      id={htmlId}
      data-test-subj={testId}
      iconType={iconType}
      isDisabled={isDisabled(disableButton)}
      href={href}
      target={href ? target : undefined}
      isLoading={isLoading}
      size="s"
      iconSide="left"
      iconSize="m"
      color="text"
    >
      {itemText}
    </EuiHeaderLink>
  );

  const buttonWithTooltip = tooltipContent ? (
    <EuiToolTip content={tooltipContent}>{button}</EuiToolTip>
  ) : (
    button
  );

  if (items && items.length > 0) {
    return <TopNavPopover items={items} anchorElement={buttonWithTooltip} />;
  }

  return buttonWithTooltip;
};
