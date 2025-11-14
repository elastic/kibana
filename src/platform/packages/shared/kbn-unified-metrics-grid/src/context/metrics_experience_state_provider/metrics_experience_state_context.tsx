/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { createContext } from 'react';
import { type MetricsExperienceRestorableState, useRestorableState } from '../../restorable_state';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';

export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
  onPageChange: (value: number) => void;
  onDimensionsChange: (value: Array<{ name: string; type: string }>) => void;
  onValuesChange: (value: string[]) => void;
  onSearchTermChange: (value: string) => void;
  onToggleFullscreen: () => void;
}

export const MetricsExperienceStateContext =
  createContext<MetricsExperienceStateContextValue | null>(null);

export function MetricsExperienceStateProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [dimensions, setDimensions] = useRestorableState('dimensions', []);
  const [valueFilters, setValueFilters] = useRestorableState('valueFilters', []);
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);

  const onDimensionsChange = useCallback(
    (nextDimensions: Array<{ name: string; type: string }>) => {
      setCurrentPage(0);
      setDimensions(nextDimensions);
      setValueFilters((prevValueFilters) => {
        if (nextDimensions.length === 0) {
          return [];
        }
        const dimensionNames = new Set(nextDimensions.map((d) => d.name));
        return prevValueFilters.filter((v) =>
          dimensionNames.has(v.split(FIELD_VALUE_SEPARATOR)[0])
        );
      });
    },
    [setValueFilters, setCurrentPage, setDimensions]
  );

  const onValuesChange = useCallback(
    (values: string[]) => {
      setValueFilters(values);
    },
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

  return (
    <MetricsExperienceStateContext.Provider
      value={{
        currentPage,
        dimensions,
        isFullscreen,
        searchTerm,
        valueFilters,
        onPageChange,
        onDimensionsChange,
        onValuesChange,
        onSearchTermChange,
        onToggleFullscreen,
      }}
    >
      {children}
    </MetricsExperienceStateContext.Provider>
  );
}
