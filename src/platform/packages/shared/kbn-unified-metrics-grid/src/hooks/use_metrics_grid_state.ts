/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectCurrentPage,
  selectDimensions,
  selectValueFilters,
  setCurrentPage,
  setDimensions,
  setValueFilters,
} from '../store/slices';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';

export const useMetricsGridState = () => {
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectCurrentPage);
  const dimensions = useAppSelector(selectDimensions);
  const valueFilters = useAppSelector(selectValueFilters);

  const onDimensionsChange = useCallback(
    (nextDimensions: string[]) => {
      dispatch(setDimensions(nextDimensions));
      const filteredValues =
        nextDimensions.length === 0
          ? []
          : valueFilters.filter((v) => nextDimensions.includes(v.split(FIELD_VALUE_SEPARATOR)[0]));
      dispatch(setValueFilters(filteredValues));
    },
    [dispatch, valueFilters]
  );

  const onValuesChange = useCallback(
    (values: string[]) => dispatch(setValueFilters(values)),
    [dispatch]
  );

  const onClearAllDimensions = useCallback(() => {
    dispatch(setDimensions([]));
    dispatch(setValueFilters([]));
  }, [dispatch]);

  const onClearValues = useCallback(() => onValuesChange([]), [onValuesChange]);

  const onPageChange = useCallback((page: number) => dispatch(setCurrentPage(page)), [dispatch]);

  return {
    currentPage,
    dimensions,
    valueFilters,
    onDimensionsChange,
    onValuesChange,
    onPageChange,
    onClearAllDimensions,
    onClearValues,
  };
};
