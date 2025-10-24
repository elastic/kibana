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
import { EuiFocusTrap, keys } from '@elastic/eui';
import { cx } from '@emotion/css';
import { css } from '@emotion/react';
import { useMetricsGridState, useMetricsGridFullScreen } from '../hooks';
import {
  METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS,
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_CLASS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
  METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ,
  METRICS_GRID_RESTRICT_BODY_CLASS,
} from '../common/constants';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';
import { SearchButton } from './toolbar/right_side_actions/search_button';

export interface MetricsGridWrapperProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions' | 'isComponentVisible'> {
  indexPattern: string;
  chartToolbarCss?: SerializedStyles;
  fields: MetricField[];
  dimensionFilteredMetrics?: Pick<MetricField, 'name' | 'index'>[];
  children?: React.ReactNode;
  hideRightSideActions?: boolean;
  hideDimensionsSelector?: boolean;
}

export const MetricsGridWrapper = ({
  indexPattern,
  renderToggleActions,
  chartToolbarCss,
  requestParams,
  fields,
  dimensionFilteredMetrics = [],
  children,
  isComponentVisible,
  hideRightSideActions = false,
  hideDimensionsSelector = false,
}: MetricsGridWrapperProps) => {
  const { leftSideActions, rightSideActions } = useToolbarActions({
    fields,
    dimensionFilteredMetrics,
    indexPattern,
    renderToggleActions,
    requestParams,
    hideDimensionsSelector,
  });

  const { searchTerm, onSearchTermChange, isFullscreen, onToggleFullscreen } =
    useMetricsGridState();

  const { metricsGridId, setMetricsGridWrapper, styles } = useMetricsGridFullScreen();

  const restrictBodyClass = styles[METRICS_GRID_RESTRICT_BODY_CLASS];
  const metricsGridFullScreenClass = styles[METRICS_GRID_FULL_SCREEN_CLASS];

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === keys.ESCAPE && isFullscreen && !areSelectorPortalsOpen()) {
        e.preventDefault();
        onToggleFullscreen();
      }
    },
    [isFullscreen, onToggleFullscreen]
  );

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
        data-test-subj="metricsExperienceGridWrapper"
        className={cx('metricsExperienceGridWrapper', {
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
            id="metricsExperienceGridPanel"
            toolbarCss={chartToolbarCss}
            toolbar={{
              leftSide: leftSideActions,
              rightSide: rightSideActions,
              additionalControls: {
                prependRight: (
                  <SearchButton
                    value={searchTerm}
                    isFullscreen={isFullscreen}
                    onSearchTermChange={onSearchTermChange}
                    onKeyDown={onKeyDown}
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
    </EuiFocusTrap>
  );
};

const areSelectorPortalsOpen = () => {
  const portals = document.querySelectorAll('[data-euiportal]');

  for (const portal of portals) {
    const hasBreakdownSelector = portal.querySelector(
      `[data-test-subj*=${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}]`
    );
    const hasValuesSelector = portal.querySelector(
      `[data-test-subj*=${METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ}]`
    );
    const hasSelectableList = portal.querySelector('[data-test-subj*="Selectable"]');

    if (hasBreakdownSelector || hasValuesSelector || hasSelectableList) {
      // Check if the portal is visible and has focusable content
      const style = window.getComputedStyle(portal);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
  }
};
