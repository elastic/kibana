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
import type { Dimension } from '../../../../../types';
import {
  type MetricsExperienceRestorableState,
  useRestorableState,
} from '../../../../../restorable_state';

export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
  onPageChange: (value: number) => void;
  onDimensionsChange: (value: Dimension[]) => void;
  onSearchTermChange: (value: string) => void;
  onToggleFullscreen: () => void;
}

export const MetricsExperienceStateContext =
  createContext<MetricsExperienceStateContextValue | null>(null);

export function MetricsExperienceStateProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useRestorableState('currentPage', 0);
  const [selectedDimensions, setSelectedDimensions] = useRestorableState('selectedDimensions', []);
  const [searchTerm, setSearchTerm] = useRestorableState('searchTerm', '');
  const [isFullscreen, setIsFullscreen] = useRestorableState('isFullscreen', false);

  const onDimensionsChange = useCallback(
    (nextDimensions: Dimension[]) => {
      setCurrentPage(0);
      setSelectedDimensions(nextDimensions);
    },
    [setCurrentPage, setSelectedDimensions]
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
        isFullscreen,
        searchTerm,
        selectedDimensions,
        onPageChange,
        onDimensionsChange,
        onSearchTermChange,
        onToggleFullscreen,
      }}
    >
      {children}
    </MetricsExperienceStateContext.Provider>
  );
}
