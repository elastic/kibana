/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { i18n } from '@kbn/i18n';
import { FIELD_VALUE_SEPARATOR } from '../../common/utils/value_formatters/constants';
import { useMetricFieldsQuery } from '../hooks';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setCurrentPage,
  selectCurrentPage,
  selectDisplayDensity,
  selectSearchTerm,
  selectDimensions,
  selectValueFilters,
  setDimensions,
  setValueFilters,
} from '../store/slices';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import { DimensionsSelector } from './toolbar/dimensions_selector';
import { ValuesSelector } from './toolbar/values_selector';

export const MetricsExperienceGrid = ({
  dataView,
  renderToggleActions,
  chartToolbarCss,
  histogramCss,
  getTimeRange,
}: ChartSectionProps) => {
  // Get grid-specific state from Redux store
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectCurrentPage);
  const displayDensity = useAppSelector(selectDisplayDensity);
  const searchTerm = useAppSelector(selectSearchTerm);
  const dimensions = useAppSelector(selectDimensions);
  const valueFilters = useAppSelector(selectValueFilters);

  const indexPattern = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);

  const { data: fields = [], isLoading: loading } = useMetricFieldsQuery({
    index: indexPattern,
    ...getTimeRange(),
  });

  const onDimensionsChange = useCallback(
    (nextDimensions: string[]) => {
      dispatch(setDimensions(nextDimensions));

      // If no dimensions are selected, clear all values
      if (nextDimensions.length === 0) {
        dispatch(setDimensions([]));
      } else {
        // Filter existing values to keep only those whose dimension is still selected
        const filteredValues = valueFilters.filter((selectedValue) => {
          const [field] = selectedValue.split(`${FIELD_VALUE_SEPARATOR}`);
          return nextDimensions.includes(field);
        });

        dispatch(setValueFilters(filteredValues));
      }
    },
    [dispatch, valueFilters]
  );

  const onValuesChange = useCallback(
    (values: string[]) => {
      dispatch(setValueFilters(values));
    },
    [dispatch]
  );

  // Set pageSize based on display density
  const pageSize = displayDensity === 'compact' ? 20 : 15;

  const actions: IconButtonGroupProps['buttons'] = [
    {
      iconType: 'search',
      label: i18n.translate('discover.metricsExperience.searchButton', {
        defaultMessage: 'Search',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
    {
      iconType: 'fullScreen',
      label: i18n.translate('discover.metricsExperience.fullScreenButton', {
        defaultMessage: 'Full screen',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
  ];

  const rightSideComponents = useMemo(
    () => [
      renderToggleActions(),
      <DimensionsSelector
        fields={fields}
        onChange={onDimensionsChange}
        selectedDimensions={dimensions}
      />,
      dimensions.length > 0 ? (
        <ValuesSelector
          selectedDimensions={dimensions}
          selectedValues={valueFilters}
          onChange={onValuesChange}
          disabled={dimensions.length === 0}
          indices={[indexPattern]}
          timeRange={getTimeRange()}
        />
      ) : null,
    ],
    [
      dimensions,
      fields,
      getTimeRange,
      indexPattern,
      onDimensionsChange,
      onValuesChange,
      renderToggleActions,
      valueFilters,
    ]
  );

  // Convert applied selected values to filters format for API
  const filters = useMemo(() => {
    if (!valueFilters || valueFilters.length === 0) {
      return [];
    }

    // Map selected values to their fields using dimensionValues
    return valueFilters
      .map((selectedValue) => {
        const [field, value] = selectedValue.split(`${0x1d}`);
        return {
          field,
          value,
        };
      })
      .filter((filter) => filter.field !== ''); // Only include filters with valid fields
  }, [valueFilters]);

  // Filter fields based on search term, dimensions, and data availability
  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      // Filter out fields with no sample data
      const hasData = !field.no_data;

      // Filter by search term
      const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by dimensions - if no dimensions are selected, show all
      // If dimensions are selected, show only charts that contain ALL selected dimensions
      const matchesDimensions =
        dimensions.length === 0 ||
        dimensions.every((selectedDimension) =>
          field.dimensions.some((dimension) => dimension.name === selectedDimension)
        );

      return hasData && matchesSearch && matchesDimensions;
    });
  }, [fields, searchTerm, dimensions]);

  // Calculate pagination
  const totalPages = useMemo(
    () => Math.ceil(filteredFields.length / pageSize),
    [filteredFields.length, pageSize]
  );

  const currentFields = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredFields.slice(startIndex, endIndex);
  }, [filteredFields, currentPage, pageSize]);

  // Pagination handler
  const handlePageChange = (pageIndex: number) => {
    dispatch(setCurrentPage(pageIndex));
  };

  return (
    <ChartSectionTemplate
      id="unifiedMetricsExperienceGridPanel"
      toolbarCss={chartToolbarCss}
      toolbar={{
        rightSide: rightSideComponents,
        leftSide: actions,
      }}
    >
      <div css={histogramCss}>
        <MetricsGrid
          fields={currentFields}
          timeRange={getTimeRange()}
          loading={loading}
          searchTerm={searchTerm}
          filters={filters}
          dimensions={dimensions}
          pivotOn="metric"
          displayDensity={displayDensity}
        />

        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      </div>
    </ChartSectionTemplate>
  );
};
