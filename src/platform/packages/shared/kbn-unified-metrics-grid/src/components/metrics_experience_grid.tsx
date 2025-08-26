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
import { css } from '@emotion/react';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
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
import { useMetricFieldsQuery } from '../hooks';

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

  const pageSize = displayDensity === 'compact' ? 20 : 15;
  const actions: IconButtonGroupProps['buttons'] = [
    {
      iconType: 'search',
      label: i18n.translate('metricsExperience.searchButton', {
        defaultMessage: 'Search',
      }),

      onClick: () => {},
      'data-test-subj': 'metricsExperienceEditVisualization',
    },
    {
      iconType: 'fullScreen',
      label: i18n.translate('metricsExperience.fullScreenButton', {
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

  const filters = useMemo(() => {
    if (!valueFilters || valueFilters.length === 0) {
      return [];
    }

    return valueFilters
      .map((selectedValue) => {
        const [field, value] = selectedValue.split(`${FIELD_VALUE_SEPARATOR}`);
        return {
          field,
          value,
        };
      })
      .filter((filter) => filter.field !== '');
  }, [valueFilters]);

  // Filter fields based on search term, dimensions, and data availability
  const filteredFields = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return fields.filter(
      (field) =>
        !field.noData &&
        field.name.toLowerCase().includes(term) &&
        (dimensions.length === 0 ||
          dimensions.every((sel) => field.dimensions.some((d) => d.name === sel)))
    );
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
        leftSide: rightSideComponents,
        rightSide: actions,
      }}
    >
      <section
        tabIndex={-1}
        data-test-subj="unifiedMetricsExperienceRendered"
        css={css`
          ${histogramCss || ''}
          height: 100%;
          overflow: hidden;
        `}
      >
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
      </section>
    </ChartSectionTemplate>
  );
};
