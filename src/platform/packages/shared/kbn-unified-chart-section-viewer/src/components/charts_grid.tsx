/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { EuiFocusTrap } from '@elastic/eui';
import { cx } from '@emotion/css';
import { css } from '@emotion/react';
import { ChartSectionTemplate, type ChartSectionTemplateProps } from '@kbn/unified-histogram';
import {
  FULLSCREEN_BODY_STYLES_CLASS,
  useMetricsGridFullScreen,
} from './observability/metrics/hooks';
import {
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_CLASS,
  METRICS_GRID_RESTRICT_BODY_CLASS,
} from '../common/constants';

export interface ChartsGridProps
  extends Pick<ChartSectionTemplateProps, 'toolbar' | 'toolbarCss' | 'toolbarWrapAt' | 'id'> {
  isFullscreen?: boolean;
  isComponentVisible?: boolean;
  onToggleFullscreen?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export const ChartsGrid = ({
  id,
  toolbarCss,
  toolbar,
  toolbarWrapAt,
  isFullscreen,
  children,
  isComponentVisible,
  onKeyDown,
}: React.PropsWithChildren<ChartsGridProps>) => {
  const { metricsGridId, styles } = useMetricsGridFullScreen({ prefix: id });
  const metricsGridRef = useRef<HTMLDivElement>(null);

  const restrictBodyClass = styles[METRICS_GRID_RESTRICT_BODY_CLASS];
  const metricsGridFullScreenClass = styles[METRICS_GRID_FULL_SCREEN_CLASS];

  const fullHeightCss = css`
    height: 100%;
  `;

  useEffect(() => {
    // When the metrics grid is fullscreen, we hide the chrome and reset competing
    // stacking contexts so the grid can render above any embeddable panels or portals.
    if (isFullscreen) {
      const fullscreenBodyClasses = [
        // Emotion-generated class that applies the restrict-body styles
        // (body overflow hidden, flyout sizing, flyout/tooltip z-index overrides).
        restrictBodyClass,
        // Emotion-generated class that resets stacking contexts (`z-index: unset`)
        // on elements outside the fullscreen grid (e.g., embeddable panels) so the
        // grid can render above them.
        FULLSCREEN_BODY_STYLES_CLASS,
        // Triggers Kibana's `handleEuiFullScreenChanges` side effect (same mechanism
        // used by EUI DataGrid), which calls `chrome.setIsVisible(false)` to hide
        // the chrome entirely.
        'euiDataGrid__restrictBody',
      ] as const;

      document.body.classList.add(...fullscreenBodyClasses);

      return () => {
        document.body.classList.remove(...fullscreenBodyClasses);
      };
    }
  }, [isFullscreen, restrictBodyClass]);

  return (
    <EuiFocusTrap
      disabled={!isFullscreen}
      // Using callback because useGeneratedHtmlId produces IDs with ':' which breaks CSS selectors
      initialFocus={() => metricsGridRef.current as HTMLElement}
      css={css`
        height: ${isComponentVisible ? '100%' : 0};
        visibility: ${isComponentVisible ? 'visible' : 'hidden'};
      `}
    >
      <div
        data-test-subj={`metricsGridWrapper${isFullscreen ? '-fullScreen' : ''}`}
        className="metricsGridWrapper"
        onKeyDown={onKeyDown}
        css={fullHeightCss}
      >
        <div
          ref={metricsGridRef}
          id={metricsGridId}
          tabIndex={-1}
          data-test-subj="metricsExperienceGrid"
          className={cx(METRICS_GRID_CLASS, {
            [METRICS_GRID_FULL_SCREEN_CLASS]: isFullscreen,
            [metricsGridFullScreenClass]: isFullscreen,
          })}
          css={fullHeightCss}
        >
          <ChartSectionTemplate
            id={id}
            toolbarCss={toolbarCss}
            toolbarWrapAt={toolbarWrapAt}
            toolbar={toolbar}
          >
            {children}
          </ChartSectionTemplate>
        </div>
      </div>
    </EuiFocusTrap>
  );
};
