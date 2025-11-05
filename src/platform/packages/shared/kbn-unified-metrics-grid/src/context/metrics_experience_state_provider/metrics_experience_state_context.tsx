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
  onDimensionsChange: (value: string[]) => void;
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
    (nextDimensions: string[]) => {
      setCurrentPage(0);
      setDimensions(nextDimensions);
      const filteredValues =
        nextDimensions.length === 0
          ? []
          : valueFilters.filter((v) => nextDimensions.includes(v.split(FIELD_VALUE_SEPARATOR)[0]));

      setValueFilters(filteredValues);
    },
    [valueFilters, setValueFilters, setDimensions, setCurrentPage]
  );

  const onValuesChange = useCallback(
    (values: string[]) => {
      setCurrentPage(0);
      setValueFilters(values);
    },
    [setValueFilters, setCurrentPage]
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
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen, setIsFullscreen]);

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
