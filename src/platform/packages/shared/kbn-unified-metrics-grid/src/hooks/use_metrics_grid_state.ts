/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppWithTabAction, useAppWithTabSelector } from '../store/hooks';
import { metricsGridActions } from '../store/slices';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

export const useMetricsGridState = () => {
  const dispatch = useAppDispatch();

  // State selectors
  const currentPage = useAppWithTabSelector((state) => state.currentPage);
  const dimensions = useAppWithTabSelector((state) => state.dimensions);
  const valueFilters = useAppWithTabSelector((state) => state.valueFilters);
  const searchTerm = useAppWithTabSelector((state) => state.searchTerm);
  const isFullscreen = useAppWithTabSelector((state) => state.isFullscreen);

  // Action creators
  const setDimensions = useAppWithTabAction(metricsGridActions.setDimensions);
  const setValueFilters = useAppWithTabAction(metricsGridActions.setValueFilters);
  const setCurrentPage = useAppWithTabAction(metricsGridActions.setCurrentPage);
  const setSearchTerm = useAppWithTabAction(metricsGridActions.setSearchTerm);
  const toggleFullscreen = useAppWithTabAction(metricsGridActions.toggleFullscreen);

  const onDimensionsChange = useCallback(
    (nextDimensions: string[]) => {
      dispatch(setDimensions({ dimensions: nextDimensions }));

      const filteredValues =
        nextDimensions.length === 0
          ? []
          : valueFilters.filter((value) => {
              const fieldName = value.split(FIELD_VALUE_SEPARATOR)[0];
              return nextDimensions.includes(fieldName);
            });

      dispatch(setValueFilters({ valueFilters: filteredValues }));
    },
    [dispatch, setDimensions, setValueFilters, valueFilters]
  );

  const onClearAllDimensions = useCallback(() => {
    dispatch(setDimensions({ dimensions: [] }));
    dispatch(setValueFilters({ valueFilters: [] }));
  }, [dispatch, setDimensions, setValueFilters]);

  // Simple handlers (optimized)
  const onValuesChange = useCallback(
    (values: string[]) => dispatch(setValueFilters({ valueFilters: values })),
    [dispatch, setValueFilters]
  );

  const onClearValues = useCallback(
    () => dispatch(setValueFilters({ valueFilters: [] })),
    [dispatch, setValueFilters]
  );

  const onPageChange = useCallback(
    (page: number) => dispatch(setCurrentPage({ currentPage: page })),
    [dispatch, setCurrentPage]
  );

  const onSearchTermChange = useCallback(
    (term: string) => dispatch(setSearchTerm({ searchTerm: term })),
    [dispatch, setSearchTerm]
  );

  const onClearSearchTerm = useCallback(
    () => dispatch(setSearchTerm({ searchTerm: '' })),
    [dispatch, setSearchTerm]
  );

  const onToggleFullscreen = useCallback(
    () => dispatch(toggleFullscreen({ isFullscreen: !isFullscreen })),
    [dispatch, toggleFullscreen, isFullscreen]
  );

  return {
    // State
    currentPage,
    dimensions,
    valueFilters,
    isFullscreen,
    searchTerm,

    // Actions
    onSearchTermChange,
    onClearSearchTerm,
    onDimensionsChange,
    onValuesChange,
    onClearValues,
    onPageChange,
    onClearAllDimensions,
    onToggleFullscreen,
  };
};
