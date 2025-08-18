/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import type { ComponentProps, FC, ReactNode } from 'react';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';

import { SecondaryMenu } from '../secondary_menu';
import { useNestedMenu } from './use_nested_menu';

export interface ItemProps
  extends Omit<ComponentProps<typeof SecondaryMenu.Item>, 'isActive' | 'href'> {
  children: ReactNode;
  hasSubmenu?: boolean;
  href?: string;
  iconType?: IconType;
  isActive?: boolean;
  onClick?: () => void;
  submenuPanelId?: string;
}

export const Item: FC<ItemProps> = ({
  children,
  hasSubmenu = false,
  href,
  id,
  isActive = false,
  onClick,
  submenuPanelId,
  ...props
}) => {
  const { goToPanel } = useNestedMenu();
  const { euiTheme } = useEuiTheme();

  const itemStyle = css`
    align-items: center;
    display: flex;
    justify-content: space-between;
    width: 100%;
  `;

  const arrowStyle = css`
    margin-left: ${euiTheme.size.xs};
    opacity: 0.6;
    pointer-events: none;
  `;

  const handleClick = useCallback(() => {
    onClick?.();
    if (hasSubmenu && submenuPanelId) {
      goToPanel(submenuPanelId);
    }
  }, [onClick, hasSubmenu, submenuPanelId, goToPanel]);

  return (
    <SecondaryMenu.Item
      id={id}
      href={href || ''}
      isActive={isActive}
      onClick={handleClick}
      {...props}
      key={`nested-item-${id}`}
      testSubjPrefix="nestedMenuItem"
    >
      <div css={itemStyle}>
        <span>{children}</span>
        {hasSubmenu && (
          <EuiButtonIcon
            aria-label={`${children} has submenu`}
            color="text"
            css={arrowStyle}
            display="empty"
            iconType="arrowRight"
            size="xs"
          />
        )}
      </div>
    </SecondaryMenu.Item>
  );
};
