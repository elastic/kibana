/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { css } from '@emotion/react';
import { useMetricsGridState } from '../../../hooks';
import { DimensionsSelector } from '../dimensions_selector';
import { ValuesSelector } from '../values_selector';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';

interface UseToolbarActionsProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  fields: MetricField[];
  dimensionFilteredMetrics: Pick<MetricField, 'name' | 'index'>[];
  indexPattern: string;
  hideDimensionsSelector?: boolean;
}
export const useToolbarActions = ({
  fields,
  dimensionFilteredMetrics,
  requestParams,
  indexPattern,
  renderToggleActions,
  hideDimensionsSelector = false,
}: UseToolbarActionsProps) => {
  const {
    dimensions,
    valueFilters,
    onDimensionsChange,
    onValuesChange,
    onClearValues,
    onClearAllDimensions,
    isFullscreen,
    onToggleFullscreen,
  } = useMetricsGridState();

  const { euiTheme } = useEuiTheme();

  const leftSideActions = useMemo(
    () => [
      isFullscreen ? null : renderToggleActions(),
      hideDimensionsSelector ? null : (
        <DimensionsSelector
          fields={fields}
          onChange={onDimensionsChange}
          selectedDimensions={dimensions}
          onClear={onClearAllDimensions}
          singleSelection={MAX_DIMENSIONS_SELECTIONS === 1}
        />
      ),
      dimensions.length > 0 ? (
        <ValuesSelector
          selectedDimensions={dimensions}
          selectedValues={valueFilters}
          onChange={onValuesChange}
          disabled={dimensions.length === 0}
          indices={[indexPattern]}
          timeRange={requestParams.getTimeRange()}
          onClear={onClearValues}
          dimensionFilteredMetrics={dimensionFilteredMetrics}
        />
      ) : null,
    ],
    [
      dimensions,
      fields,
      indexPattern,
      onClearAllDimensions,
      onClearValues,
      onDimensionsChange,
      onValuesChange,
      renderToggleActions,
      requestParams,
      valueFilters,
      isFullscreen,
      hideDimensionsSelector,
      dimensionFilteredMetrics,
    ]
  );

  const rightSideActions: IconButtonGroupProps['buttons'] = useMemo(() => {
    const fullscreenButtonLabel = isFullscreen
      ? i18n.translate('metricsExperience.fullScreenExitButton', {
          defaultMessage: 'Exit fullscreen (esc)',
        })
      : i18n.translate('metricsExperience.fullScreenButton', {
          defaultMessage: 'Enter fullscreen',
        });

    return [
      {
        iconType: isFullscreen ? 'fullScreenExit' : 'fullScreen',
        label: fullscreenButtonLabel,
        title: fullscreenButtonLabel,
        onClick: onToggleFullscreen,
        'data-test-subj': 'metricsExperienceToolbarFullScreen',
        css: css`
          &.euiButtonGroupButton:first-of-type {
            border: ${euiTheme.border.thin} !important;
            border-left: none !important;
            border-top-left-radius: 0px !important;
            border-bottom-left-radius: 0px !important;
          }
        `,
      },
    ];
  }, [isFullscreen, onToggleFullscreen, euiTheme.border.thin]);

  return {
    leftSideActions,
    rightSideActions,
  };
};
