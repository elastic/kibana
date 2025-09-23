/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useState, useCallback } from 'react';
import { useEuiTheme, logicalCSS, useGeneratedHtmlId, useMutationObserver } from '@elastic/eui';
import { css } from '@emotion/css';
import {
  METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS,
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_RESTRICT_BODY_CLASS,
} from '../common/constants';

export const useFullScreenStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const fullScreenZIndex = Number(euiTheme.levels.header) - 1;
    return {
      [METRICS_GRID_FULL_SCREEN_CLASS]: css`
        z-index: ${fullScreenZIndex} !important;
        position: fixed;
        inset: 0;
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
          ${logicalCSS('top', '0')}
          ${logicalCSS('height', '100%')}
        }
      `,
    };
  }, [euiTheme]);
};

// Ensure full screen metrics grids are not covered by elements with a z-index
const fullScreenBodyStyles = css`
  *:not(
      .euiFlyout,
      .${METRICS_GRID_FULL_SCREEN_CLASS}, .${METRICS_GRID_FULL_SCREEN_CLASS} *,
      [data-euiportal='true'],
      [data-euiportal='true'] *
    ) {
    z-index: unset !important;
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

export const useMetricsGridFullScreen = () => {
  const metricsGridId = useGeneratedHtmlId({ prefix: 'metricsExperienceGrid' });
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

  return { metricsGridId, metricsGridWrapper, setMetricsGridWrapper };
};
