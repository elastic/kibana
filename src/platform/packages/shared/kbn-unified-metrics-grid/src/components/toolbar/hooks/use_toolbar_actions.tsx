/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useEuiTheme, useIsWithinMaxBreakpoint } from '@elastic/eui';
import type { TimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { css } from '@emotion/react';
import { useMetricsExperienceState } from '../../../context/metrics_experience_state_provider';
import { DimensionsSelector } from '../dimensions_selector';
import { ValuesSelector } from '../values_selector';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';
interface UseToolbarActionsProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  fields: MetricField[];
  hideDimensionsSelector?: boolean;
  hideRightSideActions?: boolean;
  isLoading?: boolean;
}
export const useToolbarActions = ({
  fields,
  requestParams,
  renderToggleActions,
  hideDimensionsSelector = false,
  hideRightSideActions = false,
  isLoading = false,
}: UseToolbarActionsProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(requestParams.getTimeRange());
  const {
    dimensions,
    valueFilters,
    onDimensionsChange,
    onValuesChange,
    isFullscreen,
    onToggleFullscreen,
  } = useMetricsExperienceState();

  const { euiTheme } = useEuiTheme();

  const onClearValues = useCallback(() => {
    onValuesChange([]);
  }, [onValuesChange]);

  const isSmallScreen = useIsWithinMaxBreakpoint(isFullscreen ? 'm' : 'l');

  const toggleActions = useMemo(
    () => (isFullscreen ? undefined : renderToggleActions()),
    [isFullscreen, renderToggleActions]
  );

  const indices = useMemo(() => {
    return [...new Set(fields.map((field) => field.index))];
  }, [fields]);

  useEffect(() => {
    if (!isLoading) {
      setTimeRange(requestParams.getTimeRange());
    }
  }, [isLoading, requestParams]);

  const leftSideActions = useMemo(
    () => [
      hideDimensionsSelector ? null : (
        <DimensionsSelector
          fields={fields}
          onChange={onDimensionsChange}
          selectedDimensions={dimensions}
          singleSelection={MAX_DIMENSIONS_SELECTIONS === 1}
          fullWidth={isSmallScreen}
          isLoading={isLoading}
        />
      ),
      dimensions.length > 0 ? (
        <ValuesSelector
          selectedDimensions={dimensions}
          selectedValues={valueFilters}
          onChange={onValuesChange}
          disabled={dimensions.length === 0}
          indices={indices}
          timeRange={timeRange}
          onClear={onClearValues}
          fullWidth={isSmallScreen}
        />
      ) : null,
    ],
    [
      isSmallScreen,
      dimensions,
      fields,
      indices,
      onClearValues,
      onDimensionsChange,
      onValuesChange,
      timeRange,
      valueFilters,
      hideDimensionsSelector,
      isLoading,
    ]
  );

  const rightSideActions: IconButtonGroupProps['buttons'] = useMemo(() => {
    if (hideRightSideActions) {
      return [];
    }

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
  }, [isFullscreen, hideRightSideActions, onToggleFullscreen, euiTheme.border.thin]);

  return {
    toggleActions,
    leftSideActions,
    rightSideActions,
  };
};
