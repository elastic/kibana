/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEuiTheme, useGeneratedHtmlId, useMutationObserver, logicalCSS } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { SerializedStyles } from '@emotion/serialize';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { css, cx } from '@emotion/css';
import { useMetricsGridState } from '../hooks';
import { RightSideActions } from './toolbar/right_side_actions/right_side_actions';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';

const getFullScreenStyles = (euiTheme: EuiThemeComputed) => {
  const fullScreenZIndex = Number(euiTheme.levels.header) - 1;
  return {
    [METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS]: css`
      z-index: ${fullScreenZIndex} !important;
      position: fixed;
      inset: 0;
      background-color: ${euiTheme.colors.backgroundBasePlain};
    `,
    [METRICS_EXPERIENCE_GRID_RESTRICT_BODY_CLASS]: css`
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
};

export const METRICS_EXPERIENCE_GRID_WRAPPER_FULL_SCREEN_CLASS =
  'metricsExperienceGridWrapper--fullScreen';
export const METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS = 'metricsExperienceGrid--fullScreen';
export const METRICS_EXPERIENCE_GRID_RESTRICT_BODY_CLASS = 'metricsExperienceGrid--restrictBody';
// Ensure full screen data grids are not covered by elements with a z-index
const fullScreenStyles = css`
  *:not(
      .euiFlyout,
      .${METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS},
        .${METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS}
        *,
      [data-euiportal='true'],
      [data-euiportal='true'] *
    ) {
    z-index: unset !important;
  }
`;

const classesToToggle = [fullScreenStyles, METRICS_EXPERIENCE_GRID_WRAPPER_FULL_SCREEN_CLASS];
const toggleFullScreen = (dataGrid: HTMLElement) => {
  const fullScreenClass = dataGrid.classList.contains(METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS);

  if (fullScreenClass) {
    document.body.classList.add(...classesToToggle);
  } else {
    document.body.classList.remove(...classesToToggle);
  }
};

export const useFullScreenWatcher = () => {
  const dataGridId = useGeneratedHtmlId({ prefix: 'metricsExperienceGrid' });
  const [dataGridWrapper, setDataGridWrapper] = useState<HTMLElement | null>(null);
  const [dataGrid, setDataGrid] = useState<HTMLElement | null>(null);

  const checkForDataGrid = useCallback<MutationCallback>(
    (_, observer) => {
      const foundDataGrid = document.getElementById(dataGridId);

      if (foundDataGrid) {
        setDataGrid(foundDataGrid);
        observer.disconnect();
      }
    },
    [dataGridId]
  );

  const watchForFullScreen = useCallback<MutationCallback>(() => {
    if (dataGrid) {
      toggleFullScreen(dataGrid);
    }
  }, [dataGrid]);

  useMutationObserver(dataGridWrapper, checkForDataGrid, { childList: true, subtree: true });

  useMutationObserver(dataGrid, watchForFullScreen, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return { dataGridId, dataGridWrapper, setDataGridWrapper };
};

export interface MetricsGridWrapperProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
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
}: MetricsGridWrapperProps) => {
  const { leftSideActions } = useToolbarActions({
    fields,
    indexPattern,
    renderToggleActions,
    requestParams,
  });
  const { euiTheme } = useEuiTheme();
  const { searchTerm, onSearchTermChange, isFullscreen } = useMetricsGridState();

  const { dataGridId, setDataGridWrapper } = useFullScreenWatcher();
  const styles = useMemo(() => getFullScreenStyles(euiTheme), [euiTheme]);

  const restrictBodyClass = styles[METRICS_EXPERIENCE_GRID_RESTRICT_BODY_CLASS];
  const gridFullScreenClass = styles[METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS];

  useEffect(() => {
    // When the data grid is fullscreen, we add a class to the body to remove the extra scrollbar and stay above any fixed headers
    if (isFullscreen) {
      document.body.classList.add(METRICS_EXPERIENCE_GRID_RESTRICT_BODY_CLASS, restrictBodyClass);

      return () => {
        document.body.classList.remove(
          METRICS_EXPERIENCE_GRID_RESTRICT_BODY_CLASS,
          restrictBodyClass
        );
      };
    }
  }, [isFullscreen, restrictBodyClass]);

  return (
    <div
      data-test-subj="metricsExperienceGrid"
      className={cx(
        'metricsExperienceGridWrapper',
        {
          [METRICS_EXPERIENCE_GRID_WRAPPER_FULL_SCREEN_CLASS]: isFullscreen,
        },
        css`
          height: 100%;
        `
      )}
      ref={setDataGridWrapper}
    >
      <div
        id={dataGridId}
        className={cx(
          'metricsExperienceGrid',
          {
            [METRICS_EXPERIENCE_GRID_FULL_SCREEN_CLASS]: isFullscreen,
            [gridFullScreenClass]: isFullscreen,
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
                  key="rightSideActions"
                  searchTerm={searchTerm}
                  onSearchTermChange={onSearchTermChange}
                  fields={fields}
                  indexPattern={indexPattern}
                  renderToggleActions={renderToggleActions}
                  requestParams={requestParams}
                  data-test-subj="metricsExperienceToolbarSearchInput"
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
