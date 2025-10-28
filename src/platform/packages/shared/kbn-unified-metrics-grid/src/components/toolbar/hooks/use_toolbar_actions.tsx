/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { keys } from '@elastic/eui';
import { useMetricsGridState } from '../../../hooks';
import { DimensionsSelector } from '../dimensions_selector';
import { ValuesSelector } from '../values_selector';

interface UseToolbarActionsProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  fields: MetricField[];
  indexPattern: string;
}
export const useToolbarActions = ({
  fields,
  requestParams,
  indexPattern,
  renderToggleActions,
}: UseToolbarActionsProps) => {
  const {
    dimensions,
    valueFilters,
    onDimensionsChange,
    onValuesChange,
    onClearValues,
    onClearAllDimensions,
    onClearSearchTerm,
    isFullscreen,
    onToggleFullscreen,
  } = useMetricsGridState();

  const [showSearchInput, setShowSearchInput] = useState(false);

  const onShowSearch = useCallback(() => {
    setShowSearchInput(true);
  }, []);

  const onClearSearch = useCallback(() => {
    setShowSearchInput(false);
    onClearSearchTerm();
  }, [onClearSearchTerm]);

  // Check if dimensions or values selector portals are open
  const areSelectorPortalsOpen = useCallback(() => {
    const portals = document.querySelectorAll('[data-euiportal]');

    for (const portal of portals) {
      const hasBreakdownSelector = portal.querySelector(
        '[data-test-subj*="metricsExperienceBreakdownSelector"]'
      );
      const hasValuesSelector = portal.querySelector(
        '[data-test-subj*="metricsExperienceValuesSelector"]'
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

    return false;
  }, []);

  const onExitFullscreen = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === keys.ESCAPE && isFullscreen) {
        if (!areSelectorPortalsOpen()) {
          onToggleFullscreen();
        }
      }
    },
    [onToggleFullscreen, isFullscreen, areSelectorPortalsOpen]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === keys.ESCAPE && isFullscreen) {
        onToggleFullscreen();
      }
      if (e.key === keys.ESCAPE && !isFullscreen && showSearchInput) {
        onClearSearch();
      }
    },
    [isFullscreen, showSearchInput, onToggleFullscreen, onClearSearch]
  );

  const leftSideActions = useMemo(
    () => [
      isFullscreen ? null : renderToggleActions(),
      <DimensionsSelector
        fields={fields}
        onChange={onDimensionsChange}
        selectedDimensions={dimensions}
        onClear={onClearAllDimensions}
      />,
      dimensions.length > 0 ? (
        <ValuesSelector
          selectedDimensions={dimensions}
          selectedValues={valueFilters}
          onChange={onValuesChange}
          disabled={dimensions.length === 0}
          indices={[indexPattern]}
          timeRange={requestParams.getTimeRange()}
          onClear={onClearValues}
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
    ]
  );

  return {
    leftSideActions,
    onClearSearch,
    showSearchInput,
    isFullscreen,
    onToggleFullscreen,
    onShowSearch,
    onExitFullscreen,
    onKeyDown,
  };
};
