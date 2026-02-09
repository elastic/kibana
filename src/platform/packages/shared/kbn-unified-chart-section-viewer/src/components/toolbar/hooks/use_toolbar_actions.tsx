/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { useEuiTheme, useIsWithinMaxBreakpoint } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { css } from '@emotion/react';
import type { Dimension, MetricField, UnifiedMetricsGridProps } from '../../../types';
import { useMetricsExperienceState } from '../../observability/metrics/context/metrics_experience_state_provider';
import { DimensionsSelector } from '../dimensions_selector';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';

interface UseToolbarActionsProps extends Pick<UnifiedMetricsGridProps, 'renderToggleActions'> {
  allMetricFields: MetricField[];
  dimensions: Dimension[];
  hideDimensionsSelector?: boolean;
  hideRightSideActions?: boolean;
  isLoading?: boolean;
}

export const useToolbarActions = ({
  allMetricFields,
  dimensions,
  renderToggleActions,
  hideDimensionsSelector = false,
  hideRightSideActions = false,
  isLoading = false,
}: UseToolbarActionsProps) => {
  const { selectedDimensions, onDimensionsChange, isFullscreen, onToggleFullscreen } =
    useMetricsExperienceState();

  const { euiTheme } = useEuiTheme();

  const isSmallScreen = useIsWithinMaxBreakpoint(isFullscreen ? 'm' : 'l');

  const toggleActions = useMemo(
    () => (isFullscreen ? undefined : renderToggleActions()),
    [isFullscreen, renderToggleActions]
  );

  const leftSideActions = useMemo(
    () => [
      hideDimensionsSelector ? null : (
        <DimensionsSelector
          fields={allMetricFields}
          dimensions={dimensions}
          onChange={onDimensionsChange}
          selectedDimensions={selectedDimensions}
          singleSelection={MAX_DIMENSIONS_SELECTIONS <= 1}
          fullWidth={isSmallScreen}
          isLoading={isLoading}
        />
      ),
    ],
    [
      isSmallScreen,
      selectedDimensions,
      allMetricFields,
      dimensions,
      onDimensionsChange,
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
