/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { createContext } from 'react';
import type { Dimension, DimensionValueFilters } from '../../types';
import { type MetricsExperienceRestorableState, useRestorableState } from '../../restorable_state';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';
import type { FieldSpecId } from '../../common/utils';
import { parseDimensionFilters } from '../../common/utils/parse_dimension_filters';

export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
  dimensionFilters: DimensionValueFilters | undefined;
  onPageChange: (value: number) => void;
  onDimensionsChange: (value: Dimension[]) => void;
  onDimensionValuesChange: (items: { value: string; metricFields: Set<FieldSpecId> }[]) => void;
  onSearchTermChange: (value: string) => void;
  onToggleFullscreen: () => void;
}

export const MetricsExperienceStateContext =
  createContext<MetricsExperienceStateContextValue | null>(null);

export function MetricsExperienceStateProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [selectedDimensions, setSelectedDimensions] = useRestorableState('selectedDimensions', []);
  const [selectedDimensionValues, setSelectedDimensionValues] = useRestorableState(
    'selectedDimensionValues',
    []
  );
  const [selectedValueMetricFieldIds, setSelectedValueMetricFieldIds] = useRestorableState(
    'selectedValueMetricFieldIds',
    []
  );
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);

  const onDimensionsChange = useCallback(
    (nextDimensions: Dimension[]) => {
      setCurrentPage(0);
      setSelectedDimensions(nextDimensions);
      setSelectedDimensionValues((prevValueFilters) => {
        if (nextDimensions.length === 0) {
          return [];
        }
        const dimensionNames = new Set(nextDimensions.map((d) => d.name));
        return prevValueFilters.filter((v) =>
          dimensionNames.has(v.split(FIELD_VALUE_SEPARATOR)[0])
        );
      });
    },
    [setCurrentPage, setSelectedDimensionValues, setSelectedDimensions]
  );

  const onDimensionValuesChange = useCallback(
    (items: { value: string; metricFields: Set<FieldSpecId> }[]) => {
      setSelectedDimensionValues(items.map((item) => item.value));
      setSelectedValueMetricFieldIds(items.flatMap((item) => Array.from(item.metricFields)));
    },
    [setSelectedDimensionValues, setSelectedValueMetricFieldIds]
  );

  const onPageChange = useCallback((page: number) => setCurrentPage(page), [setCurrentPage]);

  const onSearchTermChange = useCallback(
    (term: string) => {
      setCurrentPage(0);
      setSearchTerm(term);
    },
    [setSearchTerm, setCurrentPage]
  );

  const onToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, [setIsFullscreen]);

  const dimensionFilters = useMemo(
    () => parseDimensionFilters(selectedDimensionValues),
    [selectedDimensionValues]
  );

  return (
    <MetricsExperienceStateContext.Provider
      value={{
        currentPage,
        selectedDimensions,
        isFullscreen,
        searchTerm,
        selectedDimensionValues,
        selectedValueMetricFieldIds,
        dimensionFilters,
        onPageChange,
        onDimensionsChange,
        onDimensionValuesChange,
        onSearchTermChange,
        onToggleFullscreen,
      }}
    >
      {children}
    </MetricsExperienceStateContext.Provider>
  );
}
