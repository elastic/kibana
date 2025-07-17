/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, ForwardedRef } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiButtonIconProps, EuiToolTip, IconType } from '@elastic/eui';

export interface SideNavFooterItemProps extends Omit<EuiButtonIconProps, 'iconType'> {
  hasContent?: boolean;
  href?: string;
  iconType?: IconType;
  isCurrent: boolean;
  label: string;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * Toggle button pattern: https://eui.elastic.co/docs/components/navigation/buttons/button/#toggle-button
 */
export const SideNavFooterItem = forwardRef<HTMLDivElement, SideNavFooterItemProps>(
  ({ hasContent, iconType, isCurrent, label, ...props }, ref: ForwardedRef<HTMLDivElement>) => {
    const wrapperStyles = css`
      display: flex;
      justify-content: center;
      width: 100%;
    `;

    const menuItem = (
      <EuiButtonIcon
        aria-label={label}
        color={isCurrent ? 'primary' : 'text'}
        display={isCurrent ? 'base' : 'empty'}
        iconType={iconType || 'empty'}
        size="s"
        {...props}
      />
    );

    if (!hasContent)
      return (
        <EuiToolTip
          anchorProps={{
            css: wrapperStyles,
          }}
          disableScreenReaderOutput
          content={label}
          position="right"
        >
          {menuItem}
        </EuiToolTip>
      );

    return (
      <div ref={ref} css={wrapperStyles}>
        {menuItem}
      </div>
    );
  }
);
