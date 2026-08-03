/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { useIsWithinMaxBreakpoint } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import type { Dimension, ParsedMetricItem, UnifiedMetricsGridProps } from '../../../types';
import { useMetricsExperienceState } from '../../observability/metrics/context/metrics_experience_state_provider';
import { DimensionsSelector } from '../dimensions_selector';
import { SortSelector } from '../sort_selector';
import {
  MAX_DIMENSIONS_SELECTIONS,
  FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
} from '../../../common/constants';
import { useFeatureFlag } from './use_feature_flag';

interface UseToolbarActionsProps extends Pick<UnifiedMetricsGridProps, 'renderToggleActions'> {
  allDimensions: Dimension[];
  onDimensionsChange?: (dimensions: Dimension[]) => void;
  hideDimensionsSelector?: boolean;
  hideRightSideActions?: boolean;
  isLoading?: boolean;
  /** Forwarded to {@link DimensionsSelector}; see its prop docs. */
  metricItems?: ParsedMetricItem[];
  onOpenGridSettings: () => void;
}

export const useToolbarActions = ({
  allDimensions,
  renderToggleActions,
  onDimensionsChange: onDimensionsChangeProp,
  hideDimensionsSelector = false,
  hideRightSideActions = false,
  isLoading = false,
  metricItems,
  onOpenGridSettings,
}: UseToolbarActionsProps) => {
  const {
    selectedDimensions,
    onDimensionsChange,
    isFullscreen,
    onToggleFullscreen,
    metricsSort,
    onMetricsSortChange,
  } = useMetricsExperienceState();
  const onDimensionsSelectionChange = onDimensionsChangeProp ?? onDimensionsChange;

  const isEditGridEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_EDIT_GRID_SETTINGS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_EDIT_GRID_SETTINGS_ENABLED]
  );
  const isSortingEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_SORTING_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_SORTING_ENABLED]
  );

  const isSmallScreen = useIsWithinMaxBreakpoint(isFullscreen ? 'm' : 'l');

  const toggleActions = useMemo(
    () => (isFullscreen ? undefined : renderToggleActions()),
    [isFullscreen, renderToggleActions]
  );

  const leftSideActions = useMemo(
    () => [
      hideDimensionsSelector ? null : (
        <DimensionsSelector
          dimensions={allDimensions}
          onChange={onDimensionsSelectionChange}
          selectedDimensions={selectedDimensions}
          singleSelection={MAX_DIMENSIONS_SELECTIONS <= 1}
          fullWidth={isSmallScreen}
          isLoading={isLoading}
          metricItems={metricItems}
        />
      ),
      isSortingEnabled ? (
        <SortSelector sort={metricsSort} onChange={onMetricsSortChange} fullWidth={isSmallScreen} />
      ) : null,
    ],
    [
      isSmallScreen,
      selectedDimensions,
      allDimensions,
      onDimensionsSelectionChange,
      hideDimensionsSelector,
      isLoading,
      metricItems,
      metricsSort,
      onMetricsSortChange,
      isSortingEnabled,
    ]
  );

  const rightSideActions: IconButtonGroupProps['buttons'] = useMemo(() => {
    if (hideRightSideActions) {
      return [];
    }

    const editGridLabel = i18n.translate('metricsExperience.editGridButton', {
      defaultMessage: 'Edit grid of metrics',
    });

    const fullscreenButtonLabel = isFullscreen
      ? i18n.translate('metricsExperience.fullScreenExitButton', {
          defaultMessage: 'Exit fullscreen (esc)',
        })
      : i18n.translate('metricsExperience.fullScreenButton', {
          defaultMessage: 'Enter fullscreen',
        });

    return [
      ...(isEditGridEnabled
        ? [
            {
              iconType: 'pencil',
              label: editGridLabel,
              toolTipContent: editGridLabel,
              onClick: onOpenGridSettings,
              'data-test-subj': 'metricsExperienceEditGridButton',
            },
          ]
        : []),
      {
        iconType: isFullscreen ? 'fullScreenExit' : 'fullScreen',
        label: fullscreenButtonLabel,
        toolTipContent: fullscreenButtonLabel,
        onClick: onToggleFullscreen,
        'data-test-subj': 'metricsExperienceToolbarFullScreen',
      },
    ];
  }, [
    isFullscreen,
    hideRightSideActions,
    onToggleFullscreen,
    onOpenGridSettings,
    isEditGridEnabled,
  ]);

  return {
    toggleActions,
    leftSideActions,
    rightSideActions,
  };
};
