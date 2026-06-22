/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { SecondaryMenuSectionEmptyState } from '../../../types';
import { SecondaryMenuSectionEmptyStateComponent } from './section_empty_state';

const REORDER_ANIMATION_MS = 300;

export interface SecondaryMenuSectionProps {
  animateItemReorder?: boolean;
  children: ReactNode;
  emptyState?: SecondaryMenuSectionEmptyState;
  label?: string;
}

export const SecondaryMenuSectionComponent = ({
  animateItemReorder = false,
  children,
  emptyState,
  label,
}: SecondaryMenuSectionProps): JSX.Element => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme, highContrastMode } = euiThemeContext;
  const listRef = useRef<HTMLUListElement>(null);
  const previousItemPositionsRef = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    if (!animateItemReorder) {
      previousItemPositionsRef.current = new Map();
      return;
    }

    const list = listRef.current;
    if (!list) {
      return;
    }

    const nextPositions = new Map<string, DOMRect>();

    list.querySelectorAll<HTMLLIElement>(':scope > li').forEach((item) => {
      const itemId = item.querySelector<HTMLElement>('[id]')?.id;
      if (!itemId) {
        return;
      }

      const nextRect = item.getBoundingClientRect();
      const previousRect = previousItemPositionsRef.current.get(itemId);

      if (previousRect) {
        const deltaY = previousRect.top - nextRect.top;

        if (Math.abs(deltaY) > 0.5) {
          item.style.transform = `translateY(${deltaY}px)`;
          item.style.transition = 'transform 0s';

          requestAnimationFrame(() => {
            item.style.transition = `transform ${REORDER_ANIMATION_MS}ms ease-out`;
            item.style.transform = '';
          });
        }
      }

      nextPositions.set(itemId, nextRect);
    });

    previousItemPositionsRef.current = nextPositions;
  }, [animateItemReorder, children]);

  const sectionId = label ? label.replace(/\s+/g, '-').toLowerCase() : undefined;

  const secondaryMenuWrapperStyles = css`
    padding: ${euiTheme.size.m};
    position: relative;

    &:not(:last-child) {
      ${highContrastMode
        ? `
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
        margin-left: ${euiTheme.size.m};
        margin-right: ${euiTheme.size.m};
        padding-left: 0;
        padding-right: 0;
      `
        : `
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: ${euiTheme.size.m};
          right: ${euiTheme.size.m};
          height: ${euiTheme.border.width.thin};
          background-color: ${euiTheme.colors.borderBaseSubdued};
        }
      `}
    }
  `;

  const labelStyles = css`
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    display: block;
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    width: 100%;
  `;

  const hasItems = React.Children.count(children) > 0;

  return (
    <div css={secondaryMenuWrapperStyles} role="group" aria-labelledby={sectionId || undefined}>
      {label && (
        <EuiText id={sectionId} css={labelStyles} component="span">
          {label}
        </EuiText>
      )}
      {hasItems ? (
        <ul ref={listRef} css={listStyles} role="none">
          {children}
        </ul>
      ) : (
        emptyState && <SecondaryMenuSectionEmptyStateComponent {...emptyState} />
      )}
    </div>
  );
};
