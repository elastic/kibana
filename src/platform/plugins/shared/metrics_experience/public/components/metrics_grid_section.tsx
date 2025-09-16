/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import React, { type CSSProperties, useEffect, useMemo } from 'react';
import { useMetricFieldsQuery } from '../hooks';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setCurrentPage,
  selectCurrentPage,
  selectDisplayDensity,
  selectSearchTerm,
  selectDimensions,
  selectValueFilters,
  selectIsFullscreen,
  resetIndexPattern,
} from '../store/slices';
import { GridToolbar } from './grid_toolbar';
import { MetricsCount } from './metrics_count';
import { MetricsGrid } from './metrics_grid';
import { Pagination } from './pagination';

interface MetricsGridSectionProps {
  // Required props from parent
  indexPattern: string;
  timeRange: { from?: string; to?: string };
}

export const MetricsGridSection = ({ indexPattern, timeRange }: MetricsGridSectionProps) => {
  const { euiTheme } = useEuiTheme();

  // Get grid-specific state from Redux store
  const dispatch = useAppDispatch();
  const currentPage = useAppSelector(selectCurrentPage);
  const displayDensity = useAppSelector(selectDisplayDensity);
  const searchTerm = useAppSelector(selectSearchTerm);
  const dimensions = useAppSelector(selectDimensions);
  const valueFilters = useAppSelector(selectValueFilters);
  const isFullscreen = useAppSelector(selectIsFullscreen);

  // Set pageSize based on display density
  const pageSize = displayDensity === 'compact' ? 20 : 15;

  // Fetch metric fields data
  const { data: fields = [], isLoading: loading } = useMetricFieldsQuery({
    index: indexPattern,
    ...timeRange,
  });

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
      const hasData = !field.noData;

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

  useEffect(() => {
    dispatch(resetIndexPattern());
  }, [indexPattern, dispatch]);

  const style: CSSProperties = useMemo(() => {
    return isFullscreen
      ? {
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          background: euiTheme.colors.backgroundBasePlain,
        }
      : {
          position: 'relative',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          background: euiTheme.colors.backgroundBasePlain,
        };
  }, [isFullscreen, euiTheme]);

  return (
    <div style={style}>
      {/* Fixed header section - GridToolbar */}
      <div
        style={{
          flexShrink: 0,
          padding: `${euiTheme.size.s} ${euiTheme.size.s} 0 ${euiTheme.size.s}`,
        }}
      >
        <GridToolbar fields={fields} indices={[indexPattern]} timeRange={timeRange} />
        <MetricsCount count={filteredFields.length} />
      </div>

      {/* Scrollable content section - MetricsGrid and Pagination */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: `0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s}`,
          marginBottom: isFullscreen ? '0px' : '50px',
        }}
      >
        <MetricsGrid
          fields={currentFields}
          timeRange={timeRange}
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
    </div>
  );
};
