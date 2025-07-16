/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, useEuiTheme, IconType } from '@elastic/eui';
import React, { FC, ReactNode, useCallback } from 'react';
import { css } from '@emotion/react';

import { SecondaryMenu } from '../secondary_menu';
import { useNestedMenu } from '../../hooks/use_nested_menu';

export interface ItemProps {
  children: ReactNode;
  hasSubmenu?: boolean;
  href?: string;
  iconType?: IconType;
  isCurrent?: boolean;
  onClick?: () => void;
  submenuPanelId?: string;
}

export const Item: FC<ItemProps> = ({
  children,
  hasSubmenu = false,
  href,
  iconType,
  isCurrent = false,
  onClick,
  submenuPanelId,
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
      href={href || ''}
      iconType={iconType}
      isCurrent={isCurrent}
      key={`nested-item-${href || Math.random()}`}
      onClick={handleClick}
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
