/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { createContext } from 'react';
import { type MetricsExperienceRestorableState, useRestorableState } from '../../restorable_state';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';
import type { ValueFilter } from '../../types';

export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
  onPageChange: (value: number) => void;
  onDimensionsChange: (value: string[]) => void;
  onValuesChange: (value: Array<ValueFilter>) => void;
  onSearchTermChange: (value: string) => void;
  onToggleFullscreen: () => void;
  noDataMetrics: string[];
  onNoDataMetricsChange: (value: string[]) => void;
}

export const MetricsExperienceStateContext =
  createContext<MetricsExperienceStateContextValue | null>(null);

export function MetricsExperienceStateProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [dimensions, setDimensions] = useRestorableState('dimensions', []);
  const [valueFilters, setValueFilters] = useRestorableState('valueFilters', []);
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);

  const [noDataMetrics, setNoDataMetrics] = useState<string[]>([]);

  const onDimensionsChange = useCallback(
    (nextDimensions: string[]) => {
      setCurrentPage(0);
      setDimensions(nextDimensions);
      setValueFilters((prevValueFilters) => {
        if (nextDimensions.length === 0) {
          return [];
        }
        return prevValueFilters.filter((v) =>
          nextDimensions.includes(v.split(FIELD_VALUE_SEPARATOR)[0])
        );
      });
    },
    [setValueFilters, setCurrentPage, setDimensions]
  );

  const onValuesChange = useCallback(
    (values: Array<{ key: string; datasets?: string[] }>) => setValueFilters(values),
    [setValueFilters]
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

  const onNoDataMetricsChange = useCallback(
    (metrics: string[]) => {
      if (metrics.length === 0) {
        setNoDataMetrics([]);
      } else {
        setNoDataMetrics((prev) => [
          ...new Set([...prev, ...metrics].sort((a, b) => a.localeCompare(b))),
        ]);
      }
    },
    [setNoDataMetrics]
  );

  return (
    <MetricsExperienceStateContext.Provider
      value={{
        currentPage,
        dimensions,
        isFullscreen,
        searchTerm,
        valueFilters,
        noDataMetrics,
        onPageChange,
        onDimensionsChange,
        onValuesChange,
        onSearchTermChange,
        onToggleFullscreen,
        onNoDataMetricsChange,
      }}
    >
      {children}
    </MetricsExperienceStateContext.Provider>
  );
}
