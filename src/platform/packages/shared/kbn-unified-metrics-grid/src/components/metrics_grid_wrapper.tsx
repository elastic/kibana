/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { SerializedStyles } from '@emotion/serialize';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { css, cx } from '@emotion/css';
import { useMetricsGridState, useFullScreenStyles, useMetricsGridFullScreen } from '../hooks';
import {
  METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS,
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_RESTRICT_BODY_CLASS,
} from '../common/constants';
import { RightSideActions } from './toolbar/right_side_actions/right_side_actions';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';

export interface MetricsGridWrapperProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions' | 'isComponentVisible'> {
  indexPattern: string;
  chartToolbarCss?: SerializedStyles;
  fields: MetricField[];
  children?: React.ReactNode;
}

export const MetricsGridWrapper = ({
  indexPattern,
  renderToggleActions,
  chartToolbarCss,
  requestParams,
  fields,
  children,
  isComponentVisible,
}: MetricsGridWrapperProps) => {
  const { leftSideActions, onExitFullscreen } = useToolbarActions({
    fields,
    indexPattern,
    renderToggleActions,
    requestParams,
  });
  const { searchTerm, onSearchTermChange, isFullscreen } = useMetricsGridState();

  const { metricsGridId, setMetricsGridWrapper } = useMetricsGridFullScreen();
  const styles = useFullScreenStyles();

  const restrictBodyClass = styles[METRICS_GRID_RESTRICT_BODY_CLASS];
  const metricsGridFullScreenClass = styles[METRICS_GRID_FULL_SCREEN_CLASS];

  // Restriction for focus within fullscreen mode to the metrics grid elements
  const onFocusIn: (e: FocusEvent) => void = useCallback(
    (e: FocusEvent) => {
      if (!isFullscreen) return;

      const target = e.target as HTMLElement;
      const wrapperElement = document.getElementById(metricsGridId);

      if (!wrapperElement) return;

      const isWithinGridWrapper = wrapperElement.contains(target);
      const isPortalElement = target.closest('[data-euiportal]') !== null;
      const gridElement = document.querySelector('[data-test-subj="metricsExperienceGrid"]');
      const isWithinGrid = gridElement && gridElement.contains(target);

      const isAllowedElement = isWithinGridWrapper || isPortalElement || isWithinGrid;

      if (!isAllowedElement) {
        // Focus the dimensions selector as fallback
        const breakdownSelector = wrapperElement.querySelector(
          '[data-test-subj="metricsExperienceBreakdownSelectorButton"]'
        );
        if (breakdownSelector) {
          (breakdownSelector as HTMLElement).focus();
        }
      }
    },
    [isFullscreen, metricsGridId]
  );

  useEffect(() => {
    // When the metrics grid is fullscreen, we add a class to the body to remove the extra scrollbar and stay above any fixed headers
    if (isFullscreen) {
      document.body.classList.add(METRICS_GRID_RESTRICT_BODY_CLASS, restrictBodyClass);
      document.addEventListener('focusin', onFocusIn, true);

      return () => {
        document.body.classList.remove(METRICS_GRID_RESTRICT_BODY_CLASS, restrictBodyClass);
        document.removeEventListener('focusin', onFocusIn, true);
      };
    }
  }, [isFullscreen, onFocusIn, restrictBodyClass]);

  return (
    <div
      data-test-subj="metricsExperienceGridWrapper"
      className={cx(
        'metricsExperienceGridWrapper',
        {
          [METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS]: isFullscreen,
        },
        css`
          height: ${isComponentVisible ? '100%' : 0};
          visibility: ${isComponentVisible ? 'visible' : 'hidden'};
        `
      )}
      ref={setMetricsGridWrapper}
      onKeyDown={onExitFullscreen}
    >
      <div
        id={metricsGridId}
        data-test-subj="metricsExperienceGrid"
        className={cx(
          'metricsExperienceGrid',
          {
            [METRICS_GRID_FULL_SCREEN_CLASS]: isFullscreen,
            [metricsGridFullScreenClass]: isFullscreen,
          },
          css`
            height: 100%;
          `
        )}
      >
        <ChartSectionTemplate
          id="metricsExperienceGridPanel"
          toolbarCss={chartToolbarCss}
          toolbar={{
            leftSide: leftSideActions,
            additionalControls: {
              prependRight: (
                <RightSideActions
                  key="metricsExperienceGridRightSideActions"
                  searchTerm={searchTerm}
                  onSearchTermChange={onSearchTermChange}
                  fields={fields}
                  indexPattern={indexPattern}
                  renderToggleActions={renderToggleActions}
                  requestParams={requestParams}
                  data-test-subj="metricsExperienceGridToolbarSearch"
                />
              ),
            },
          }}
        >
          {children}
        </ChartSectionTemplate>
      </div>
    </div>
  );
};
