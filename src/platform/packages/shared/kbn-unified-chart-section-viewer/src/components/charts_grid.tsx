/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { EuiFocusTrap } from '@elastic/eui';
import { cx } from '@emotion/css';
import { css } from '@emotion/react';
import { ChartSectionTemplate, type ChartSectionTemplateProps } from '@kbn/unified-histogram';
import { useMetricsGridFullScreen } from './observability/metrics/hooks';
import {
  METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS,
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
  const { metricsGridId, setMetricsGridWrapper, styles } = useMetricsGridFullScreen({ prefix: id });

  const restrictBodyClass = styles[METRICS_GRID_RESTRICT_BODY_CLASS];
  const metricsGridFullScreenClass = styles[METRICS_GRID_FULL_SCREEN_CLASS];

  const fullHeightCss = css`
    height: 100%;
  `;

  useEffect(() => {
    // When the metrics grid is fullscreen, we add a class to the body to remove the extra scrollbar and stay above any fixed headers
    if (isFullscreen) {
      document.body.classList.add(METRICS_GRID_RESTRICT_BODY_CLASS, restrictBodyClass);

      return () => {
        document.body.classList.remove(METRICS_GRID_RESTRICT_BODY_CLASS, restrictBodyClass);
      };
    }
  }, [isFullscreen, restrictBodyClass]);

  return (
    <EuiFocusTrap
      disabled={!isFullscreen}
      css={css`
        height: ${isComponentVisible ? '100%' : 0};
        visibility: ${isComponentVisible ? 'visible' : 'hidden'};
      `}
    >
      <div
        data-test-subj="metricsGridWrapper"
        className={cx('metricsGridWrapper', {
          [METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS]: isFullscreen,
        })}
        onKeyDown={onKeyDown}
        ref={setMetricsGridWrapper}
        css={fullHeightCss}
      >
        <div
          id={metricsGridId}
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
