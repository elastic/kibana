/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { ComponentProps, FC, ReactNode } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useNestedMenu } from './use_nested_menu';
import { SecondaryMenu } from '../secondary_menu';

export interface PrimaryMenuItemProps
  extends Omit<ComponentProps<typeof SecondaryMenu.Item>, 'children' | 'isHighlighted'> {
  children: ReactNode;
  hasSubmenu?: boolean;
  isCurrent?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export const PrimaryMenuItem: FC<PrimaryMenuItemProps> = ({
  children,
  hasSubmenu = false,
  id,
  isCurrent,
  isHighlighted = false,
  onClick,
  ...props
}) => {
  const { goToPanel } = useNestedMenu();
  const { euiTheme } = useEuiTheme();

  const handleClick = useCallback(() => {
    if (hasSubmenu) {
      goToPanel(id, id);
    } else {
      onClick?.();
    }
  }, [hasSubmenu, id, goToPanel, onClick]);

  const arrowStyle = css`
    opacity: 0.6;
    position: absolute;
    right: ${euiTheme.size.s};
    top: 50%;
    transform: translateY(-50%);
  `;

  const wrapperStyle = css`
    display: block;
    position: relative;
    width: 100%;
  `;

  return (
    <div css={wrapperStyle}>
      <SecondaryMenu.Item
        id={id}
        isHighlighted={isHighlighted}
        isCurrent={isCurrent}
        onClick={handleClick}
        hasSubmenu={hasSubmenu}
        {...props}
      >
        {children}
        {hasSubmenu && <EuiIcon color="textDisabled" css={arrowStyle} type="arrowRight" size="m" />}
      </SecondaryMenu.Item>
    </div>
  );
};
