/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

import React, { useEffect, useRef, useState } from 'react';
import { GridLayoutStateManager } from './types';

type ScrollDirection = 'up' | 'down';

const scrollLabels: { [key in ScrollDirection]: string } = {
  up: i18n.translate('kbnGridLayout.overlays.scrollUpLabel', { defaultMessage: 'Scroll up' }),
  down: i18n.translate('kbnGridLayout.overlays.scrollDownLabel', { defaultMessage: 'Scroll down' }),
};

const scrollOnInterval = (direction: ScrollDirection) => {
  const interval = setInterval(() => {
    window.scroll({
      top: window.scrollY + (direction === 'down' ? 50 : -50),
      behavior: 'smooth',
    });
  }, 100);
  return interval;
};

const ScrollOnHover = ({
  gridLayoutStateManager,
  direction,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
  direction: ScrollDirection;
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isHidden, setIsHidden] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    gridLayoutStateManager.interactionEvent$.subscribe((interactionEvent) => {
      if (interactionEvent?.type === 'drag') {
        setIsHidden(false);
      } else {
        setIsHidden(true);
      }
    });
  }, [gridLayoutStateManager]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        setIsActive(true);
        scrollInterval.current = scrollOnInterval(direction);
      }}
      onMouseLeave={() => {
        setIsActive(false);
        if (scrollInterval.current) {
          clearInterval(scrollInterval.current);
        }
      }}
      className={'droppable'}
      css={css`
        pointer-events: ${isHidden ? 'none' : 'auto'};
        width: 100%;
        position: fixed;
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        opacity: ${isHidden ? 0 : 1};
        background-color: transparent;
        transition: opacity 100ms linear;
        padding: ${euiThemeVars.euiSizeM};
        ${direction === 'down' ? 'bottom: 0;' : 'top: 0;'}
      `}
    >
      {direction === 'up' && (
        <div
          css={css`
            height: 96px;
          `}
        />
      )}
      <div
        ref={buttonRef}
        css={css`
          display: flex;
          width: fit-content;
          align-items: center;
          background-color: ${isActive
            ? euiThemeVars.euiColorSuccess
            : euiThemeVars.euiColorEmptyShade};
          height: ${euiThemeVars.euiButtonHeight};
          line-height: ${euiThemeVars.euiButtonHeight};
          border-radius: ${euiThemeVars.euiButtonHeight};
          outline: ${isActive ? 'none' : euiThemeVars.euiBorderThin};
          transition: background-color 100ms linear, color 100ms linear;
          padding: 0 ${euiThemeVars.euiSizeL} 0 ${euiThemeVars.euiSizeL};
          color: ${isActive ? euiThemeVars.euiColorEmptyShade : euiThemeVars.euiTextColor};
        `}
      >
        <EuiText size="m">
          <strong>{scrollLabels[direction]}</strong>
        </EuiText>
      </div>
    </div>
  );
};

export const GridOverlay = ({
  gridLayoutStateManager,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <span
      ref={ref}
      css={css`
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        position: fixed;
        overflow: hidden;
        z-index: 100000000;
        pointer-events: none;
      `}
    >
      <ScrollOnHover gridLayoutStateManager={gridLayoutStateManager} direction="up" />
      <ScrollOnHover gridLayoutStateManager={gridLayoutStateManager} direction="down" />
    </span>
  );
};
