/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPortal, EuiText, transparentize } from '@elastic/eui';
import React, { useRef } from 'react';
import { GridLayoutStateManager, PanelInteractionEvent } from './types';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

const scrollOnInterval = (direction: 'up' | 'down') => {
  const interval = setInterval(() => {
    window.scroll({
      top: window.scrollY + (direction === 'down' ? 100 : -100),
      behavior: 'smooth',
    });
  }, 250);
  return interval;
};

export const GridOverlay = ({
  interactionEvent,
  gridLayoutStateManager,
}: {
  interactionEvent?: PanelInteractionEvent;
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const isDraggingEvent = interactionEvent && interactionEvent.type === 'drag';
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  const stopScrollInterval = () => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
    }
  };

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
          pointer-events: ${isDraggingEvent ? 'unset' : 'none'};
        `}
      >
        <div
          onMouseEnter={() => {
            scrollInterval.current = scrollOnInterval('up');
          }}
          onMouseLeave={stopScrollInterval}
          css={css`
            position: fixed;
            opacity: ${isDraggingEvent ? 1 : 0};
            transition: opacity 100ms linear;
            top: 0;
            width: 100%;
          `}
        >
          <div
            css={css`
              height: 96px;
            `}
          ></div>
          <div
            css={css`
              height: 50px;
              background-color: ${euiThemeVars.euiColorEmptyShade};
            `}
          >
            <EuiFlexGroup
              css={css`
                width: 100%;
                height: 100%;
              `}
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem grow={false}>
                <EuiText>Scroll up</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
        <div
          onMouseEnter={(e) => {
            scrollInterval.current = scrollOnInterval('down');
          }}
          onMouseLeave={stopScrollInterval}
          css={css`
            position: fixed;
            opacity: ${isDraggingEvent ? 1 : 0};
            transition: opacity 100ms linear;
            bottom: 0;
            width: 100%;
            height: 50px;
            background-color: ${euiThemeVars.euiColorEmptyShade};
          `}
        >
          <EuiFlexGroup
            css={css`
              width: 100%;
              height: 100%;
            `}
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem grow={false}>
              <EuiText>Scroll down</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
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
