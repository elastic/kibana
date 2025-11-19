/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEvent } from 'react';
import { EuiHeaderLink } from '@elastic/eui';
import { upperFirst, isFunction } from 'lodash';
import type { TopNavMenuItemBeta as TopNavMenuItemBetaInterface } from '../top_nav_menu/top_nav_menu_data';

export interface TopNavMenuItemBetaProps extends TopNavMenuItemBetaInterface {
  closePopover: () => void;
  isMobileMenu?: boolean;
}

export const TopNavMenuItemBeta = ({
  label,
  disableButton,
  isMobileMenu,
  href,
  target,
  htmlId,
  testId,
  isLoading,
  isExternalLink,
  run,
  closePopover,
}: TopNavMenuItemBetaProps) => {
  const itemText = upperFirst(label);

  const isDisabled = () => Boolean(isFunction(disableButton) ? disableButton() : disableButton);

  const handleClick = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (isDisabled()) return;

    run(e.currentTarget);

    if (isMobileMenu) {
      closePopover();
    }
  };

  return (
    <EuiHeaderLink
      size="s"
      onClick={href ? undefined : handleClick}
      isDisabled={isDisabled()}
      id={htmlId}
      data-test-subj={testId}
      isLoading={isLoading}
      iconSide="right"
      href={href}
      target={href ? target : undefined}
      iconSize="s"
      iconType={isExternalLink ? 'popout' : undefined}
    >
      {itemText}
    </EuiHeaderLink>
  );
};
