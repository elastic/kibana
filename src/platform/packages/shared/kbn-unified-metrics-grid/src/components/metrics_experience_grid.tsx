/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EuiFlexGridProps } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setCurrentPage,
  selectCurrentPage,
  selectValueFilters,
  selectIsFullscreen,
  setDimensions,
  setValueFilters,
  selectDimensions,
  toggleFullscreen,
} from '../store/slices';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';
import { DimensionsSelector } from './toolbar/dimensions_selector';
import { ValuesSelector } from './toolbar/values_selector';
import { useMetricFieldsQuery } from '../hooks';
import { FullScreenWrapper } from './fullscreen_wrapper/fullscreen_wrapper';
import { MetricsGridSearchControl } from './search_control/search_control';

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
  const dimensions = useAppSelector(selectDimensions);
  const valueFilters = useAppSelector(selectValueFilters);
  const isFullscreen = useAppSelector(selectIsFullscreen);
  const indexPattern = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);

  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
    },
    300,
    [searchTerm]
  );

  const handleShowSearch = useCallback(() => {
    setShowSearchInput(true);
  }, []);

  const handleClearSearch = useCallback(() => {
    setShowSearchInput(false);
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  const timeRange = useMemo(() => getTimeRange(), [getTimeRange]);

  const { data: fields = [], isLoading: loading } = useMetricFieldsQuery({
    index: indexPattern,
    ...timeRange,
  });

  const columns = useMemo<EuiFlexGridProps['columns']>(
    () => (Array.isArray(fields) ? Math.min(fields.length, 4) : 1) as EuiFlexGridProps['columns'],
    [fields]
  );

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

  // Clear both dimensions and filters because if there are no dimensions selected the values should also be cleared
  const onClearAllDimensions = useCallback(() => {
    dispatch(setDimensions([]));
    dispatch(setValueFilters([]));
  }, [dispatch]);

  const onClearValues = useCallback(() => onValuesChange([]), [onValuesChange]);

  const pageSize = columns === 4 ? 20 : 15;
  const actions: IconButtonGroupProps['buttons'] = [
    ...(!showSearchInput
      ? [
          {
            iconType: 'search',
            label: i18n.translate('metricsExperience.searchButton', {
              defaultMessage: 'Search',
            }),
            onClick: handleShowSearch,
            'data-test-subj': 'metricsExperienceToolbarSearch',
          },
        ]
      : []),
    {
      iconType: isFullscreen ? 'fullScreenExit' : 'fullScreen',
      label: isFullscreen
        ? i18n.translate('metricsExperience.fullScreenExitButton', {
            defaultMessage: 'Exit fullscreen',
          })
        : i18n.translate('metricsExperience.fullScreenButton', {
            defaultMessage: 'Enter fullscreen',
          }),
      onClick: () => {
        dispatch(toggleFullscreen());
      },
      'data-test-subj': 'metricsExperienceToolbarFullScreen',
    },
  ];

  const rightSideComponents = useMemo(
    () => [
      renderToggleActions(),
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
          timeRange={timeRange}
          onClear={onClearValues}
        />
      ) : null,
    ],
    [
      renderToggleActions,
      fields,
      onDimensionsChange,
      dimensions,
      onClearAllDimensions,
      valueFilters,
      onValuesChange,
      indexPattern,
      timeRange,
      onClearValues,
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

  const filteredFields = useMemo(() => {
    let result = fields.filter(
      (field) =>
        !field.noData &&
        (dimensions.length === 0 ||
          dimensions.every((sel) => field.dimensions.some((d) => d.name === sel)))
    );
    if (debouncedSearchTerm) {
      const search = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (field) =>
          field.name?.toLowerCase().includes(search) ||
          field.description?.toLowerCase().includes(search)
      );
    }
    return result;
  }, [fields, debouncedSearchTerm, dimensions]);

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
    <FullScreenWrapper isFullscreen={isFullscreen} dataTestSubj="metricsExperienceGrid">
      <ChartSectionTemplate
        id="metricsExperienceGridPanel"
        toolbarCss={chartToolbarCss}
        toolbar={{
          leftSide: rightSideComponents,
          rightSide: actions,
          rightSideAppend: showSearchInput ? (
            <MetricsGridSearchControl
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onClear={handleClearSearch}
              data-test-subj="metricsExperienceToolbarSearchInput"
            />
          ) : undefined,
        }}
      >
        <section
          tabIndex={-1}
          data-test-subj="metricsExperienceRendered"
          css={css`
            ${histogramCss || ''}
            height: 100%;
            overflow: hidden;
          `}
        >
          <MetricsGrid
            fields={currentFields}
            timeRange={timeRange}
            loading={loading}
            filters={filters}
            dimensions={dimensions}
            pivotOn="metric"
            columns={columns}
          />

          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </section>
      </ChartSectionTemplate>
    </FullScreenWrapper>
  );
};
