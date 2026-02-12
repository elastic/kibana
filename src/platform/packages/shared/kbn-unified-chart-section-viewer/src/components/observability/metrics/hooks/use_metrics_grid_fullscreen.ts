/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback, useMemo } from 'react';
import { logicalCSS, useEuiTheme, useGeneratedHtmlId, useMutationObserver } from '@elastic/eui';
import { css } from '@emotion/css';
import {
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_RESTRICT_BODY_CLASS,
  METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS,
} from '../../../../common/constants';

const fullScreenBodyStyles = css`
  *:not(
      .euiFlyout,
      .${METRICS_GRID_FULL_SCREEN_CLASS}, .${METRICS_GRID_FULL_SCREEN_CLASS} *,
      [data-euiportal='true'],
      [data-euiportal='true'] *
    ) {
    z-index: unset;
  }
`;

const bodyClassesToToggle = [fullScreenBodyStyles, METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS];

export const toggleMetricsGridFullScreen = (metricsGrid: HTMLElement) => {
  const hasFullScreenClass = metricsGrid.classList.contains(METRICS_GRID_FULL_SCREEN_CLASS);

  if (hasFullScreenClass) {
    document.body.classList.add(...bodyClassesToToggle);
  } else {
    document.body.classList.remove(...bodyClassesToToggle);
  }
};

export const useMetricsGridFullScreen = ({ prefix }: { prefix: string }) => {
  const { euiTheme } = useEuiTheme();
  const metricsGridId = useGeneratedHtmlId({ prefix });
  const [metricsGridWrapper, setMetricsGridWrapper] = useState<HTMLElement | null>(null);
  const [metricsGrid, setMetricsGrid] = useState<HTMLElement | null>(null);

  const findMetricsGridElement = useCallback(
    (_: MutationRecord[], observer: MutationObserver) => {
      const foundMetricsGrid = document.getElementById(metricsGridId);

      if (foundMetricsGrid) {
        setMetricsGrid(foundMetricsGrid);
        observer.disconnect();
      }
    },
    [metricsGridId]
  );

  const handleMetricsGridFullScreenToggle = useCallback(() => {
    if (metricsGrid) {
      toggleMetricsGridFullScreen(metricsGrid);
    }
  }, [metricsGrid]);

  useMutationObserver(metricsGridWrapper, findMetricsGridElement, {
    childList: true,
    subtree: true,
  });

  useMutationObserver(metricsGrid, handleMetricsGridFullScreenToggle, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const styles = useMemo(() => {
    const fullScreenZIndex = Number(euiTheme.levels.header) - 1;
    return {
      [METRICS_GRID_FULL_SCREEN_CLASS]: css`
        z-index: ${fullScreenZIndex} !important;
        position: fixed;
        inset: 0;
        ${logicalCSS('right', 'var(--euiPushFlyoutOffsetInlineEnd, 0px)')}
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `,
      [METRICS_GRID_RESTRICT_BODY_CLASS]: css`
        ${logicalCSS('height', '100vh')}
        overflow: hidden;

        .euiHeader[data-fixed-header] {
          z-index: ${fullScreenZIndex - 1} !important;
        }

        .euiOverlayMask[data-relative-to-header='below'] {
          ${logicalCSS('top', '0')}
        }

        .euiFlyout {
          ${logicalCSS('top', '0 !important')}
          ${logicalCSS('height', '100%')}
        }

        [id^='echTooltipPortalMainTooltip'] {
          z-index: ${fullScreenZIndex + 1} !important;
        }
      `,
    };
  }, [euiTheme]);

  return { metricsGridId, metricsGridWrapper, setMetricsGridWrapper, styles };
};
