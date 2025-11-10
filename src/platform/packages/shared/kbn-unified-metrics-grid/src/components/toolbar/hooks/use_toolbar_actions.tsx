/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useEuiTheme, useIsWithinMaxBreakpoint } from '@elastic/eui';
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
  indexPattern: string;
  hideDimensionsSelector?: boolean;
  hideRightSideActions?: boolean;
}
export const useToolbarActions = ({
  fields,
  requestParams,
  renderToggleActions,
  indexPattern,
  hideDimensionsSelector = false,
  hideRightSideActions = false,
}: UseToolbarActionsProps) => {
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

  const leftSideActions = useMemo(
    () => [
      hideDimensionsSelector ? null : (
        <DimensionsSelector
          fields={fields}
          onChange={onDimensionsChange}
          selectedDimensions={dimensions}
          singleSelection={MAX_DIMENSIONS_SELECTIONS === 1}
          fullWidth={isSmallScreen}
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
          fullWidth={isSmallScreen}
        />
      ) : null,
    ],
    [
      isSmallScreen,
      dimensions,
      fields,
      indexPattern,
      onClearValues,
      onDimensionsChange,
      onValuesChange,
      requestParams,
      valueFilters,
      hideDimensionsSelector,
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
