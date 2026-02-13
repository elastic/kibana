/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentProps, FC, ReactNode } from 'react';
import type { IconType } from '@elastic/eui';

import { SecondaryMenu } from '../secondary_menu';
import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';

export interface ItemProps
  extends Omit<ComponentProps<typeof SecondaryMenu.Item>, 'isHighlighted' | 'href'> {
  children: ReactNode;
  href?: string;
  iconType?: IconType;
  isHighlighted?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
}

export const Item: FC<ItemProps> = ({
  children,
  href,
  id,
  isHighlighted = false,
  isCurrent,
  ...props
}) => {
  const nestedMenuItemTestSubjPrefix = `${NAVIGATION_SELECTOR_PREFIX}-nestedMenuItem`;

  return (
    <SecondaryMenu.Item
      id={id}
      href={href || ''}
      isHighlighted={isHighlighted}
      isCurrent={isCurrent}
      {...props}
      key={`nested-item-${id}`}
      testSubjPrefix={nestedMenuItemTestSubjPrefix}
    >
      {children}
    </SecondaryMenu.Item>
  );
};
