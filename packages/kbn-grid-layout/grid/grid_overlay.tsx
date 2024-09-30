/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPortal, EuiText, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useRef, useState } from 'react';
import { GridLayoutStateManager, PanelInteractionEvent } from './types';

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

const ScrollOnHover = ({ direction, hide }: { hide: boolean; direction: ScrollDirection }) => {
  const [isActive, setIsActive] = useState(false);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);
  const stopScrollInterval = () => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
    }
  };

  return (
    <div
      onMouseEnter={() => {
        setIsActive(true);
        scrollInterval.current = scrollOnInterval(direction);
      }}
      onMouseLeave={() => {
        setIsActive(false);
        stopScrollInterval();
      }}
      css={css`
        width: 100%;
        position: fixed;
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        opacity: ${hide ? 0 : 1};
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
  interactionEvent,
  gridLayoutStateManager,
}: {
  interactionEvent?: PanelInteractionEvent;
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  return (
    <EuiPortal>
      <div
        css={css`
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          position: fixed;
          overflow: hidden;
          z-index: ${euiThemeVars.euiZModal};
          pointer-events: ${interactionEvent ? 'unset' : 'none'};
        `}
      >
        <ScrollOnHover hide={!interactionEvent} direction="up" />
        <ScrollOnHover hide={!interactionEvent} direction="down" />
        <div
          ref={gridLayoutStateManager.dragPreviewRef}
          css={css`
            pointer-events: none;
            z-index: ${euiThemeVars.euiZModal};
            border-radius: ${euiThemeVars.euiBorderRadius};
            background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
            transition: opacity 100ms linear;
            position: absolute;
          `}
        />
      </div>
    </EuiPortal>
  );
};
