/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';

import { FooterItem } from './item';
import { getFocusableElements } from '../../utils/get_focusable_elements';
import { handleRovingIndex } from '../../utils/handle_roving_index';
import { updateTabIndices } from '../../utils/update_tab_indices';

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
    if (!ref) return;

    if (typeof ref === 'function') {
      ref(node);
    } else {
      ref.current = node;
    }

    if (node) {
      const elements = getFocusableElements(node);
      updateTabIndices(elements);
    }
  };

  const wrapperStyles = css`
    align-items: center;
    border-top: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    justify-content: center;
    padding-top: ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};
  `;

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
