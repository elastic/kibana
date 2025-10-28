/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import type { ComponentProps, FC, ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import { SecondaryMenu } from '../secondary_menu';

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
  const itemStyle = css`
    align-items: center;
    display: flex;
    justify-content: space-between;
    width: 100%;
  `;

  return (
    <SecondaryMenu.Item
      id={id}
      href={href || ''}
      isHighlighted={isHighlighted}
      isCurrent={isCurrent}
      {...props}
      key={`nested-item-${id}`}
      testSubjPrefix="nestedMenuItem"
    >
      <div css={itemStyle}>
        <span>{children}</span>
      </div>
    </SecondaryMenu.Item>
  );
};
