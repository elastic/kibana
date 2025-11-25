/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEvent } from 'react';
import { EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import { upperFirst } from 'lodash';
import { getTooltip, isDisabled } from './utils';
import type { TopNavMenuItemBetaType } from './types';

export interface TopNavMenuItemBetaProps extends TopNavMenuItemBetaType {
  closePopover: () => void;
  isMobileMenu?: boolean;
}

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
  isMobileMenu,
  tooltip,
  closePopover,
}: TopNavMenuItemBetaProps) => {
  const itemText = upperFirst(label);

  const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled(disableButton)) return;

    run(e.currentTarget);

    if (isMobileMenu) {
      closePopover();
    }
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

  if (tooltipContent) {
    return <EuiToolTip content={tooltipContent}>{button}</EuiToolTip>;
  }

  return button;
};
