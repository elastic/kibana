/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import { FooterItem } from './item';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';

const getWrapperStyles = (theme: UseEuiTheme['euiTheme'], isCollapsed: boolean) => css`
  align-items: center;
  border-top: ${theme.border.width.thin} solid ${theme.colors.borderBaseSubdued};
  display: flex;
  flex-direction: column;
  gap: ${theme.size.xs};
  justify-content: center;
  padding-top: ${isCollapsed ? theme.size.s : theme.size.m};
`;

export interface FooterProps {
  children: ReactNode;
  isCollapsed: boolean;
}

interface FooterComponent
  extends ForwardRefExoticComponent<FooterProps & RefAttributes<HTMLElement>> {
  Item: typeof FooterItem;
}

const FooterBase = forwardRef<HTMLElement, FooterProps>(({ children, isCollapsed }, ref) => {
  const { euiTheme } = useEuiTheme();

  const handleRef = (node: HTMLElement | null) => {
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }

    if (node) {
      const elements = getFocusableElements(node);
      updateTabIndices(elements);
    }
  };

  const wrapperStyles = useMemo(
    () => getWrapperStyles(euiTheme, isCollapsed),
    [euiTheme, isCollapsed]
  );

  return (
    // The footer itself is not interactive but the children are
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <footer
      aria-label={i18n.translate('core.ui.chrome.sideNavigation.footerAriaLabel', {
        defaultMessage: 'Side navigation',
      })}
      css={wrapperStyles}
      onKeyDown={handleRovingIndex}
      ref={handleRef}
    >
      {children}
    </footer>
  );
});

export const Footer = Object.assign(FooterBase, {
  Item: FooterItem,
}) satisfies FooterComponent;
