/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
import { EuiFlexGrid, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { Observable } from 'rxjs';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import { Chart } from './chart';
import { MetricInsightsFlyout } from './flyout/metrics_insights_flyout';
import { EmptyState } from './empty_state/empty_state';
import { useGridNavigation } from '../hooks/use_grid_navigation';
import { FieldsMetadataProvider } from '../context/fields_metadata';

export type MetricsGridProps = Pick<
  ChartSectionProps,
  'searchSessionId' | 'services' | 'onBrushEnd' | 'onFilter' | 'abortController' | 'requestParams'
> & {
  filters?: Array<{ field: string; value: string }>;
  dimensions: string[];
  columns: EuiFlexGridProps['columns'];
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
} & (
    | {
        pivotOn: 'metric';
        fields: MetricField[];
      }
    | {
        pivotOn: 'dimension';
        fields: MetricField;
      }
  );

export const MetricsGrid = ({
  fields,
  searchSessionId,
  onBrushEnd,
  onFilter,
  dimensions,
  pivotOn,
  services,
  columns,
  abortController,
  requestParams,
  discoverFetch$,
  filters = [],
}: MetricsGridProps) => {
  const { euiTheme } = useEuiTheme();
  const gridRef = useRef<HTMLDivElement>(null);

  const [expandedMetric, setExpandedMetric] = useState<
    | {
        metric: MetricField;
        esqlQuery: string;
      }
    | undefined
  >();

  const chartSize = useMemo(() => (columns === 2 || columns === 4 ? 's' : 'm'), [columns]);

  const colorPalette = useMemo(
    () => Object.values(euiTheme.colors.vis).slice(0, 10),
    [euiTheme.colors.vis]
  );

  const rows = useMemo(() => {
    return pivotOn === 'metric'
      ? fields.map((field, i) => ({ key: `${field.name}-${i}`, metric: field }))
      : dimensions.map((dim, i) => ({ key: `${dim}-${i}`, metric: fields }));
  }, [pivotOn, fields, dimensions]);

  const gridColumns = columns || 1;
  const gridRows = Math.ceil(rows.length / gridColumns);

  const { focusedCell, handleKeyDown, handleCellClick, getRowColFromIndex } = useGridNavigation({
    gridColumns,
    gridRows,
    totalRows: rows.length,
    gridRef,
  });

  const handleViewDetails = useCallback((esqlQuery: string, metric: MetricField) => {
    setExpandedMetric({ metric, esqlQuery });
    dismissAllFlyoutsExceptFor(DiscoverFlyouts.metricInsights);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setExpandedMetric(undefined);
  }, []);

  const normalizedFields = useMemo(() => (Array.isArray(fields) ? fields : [fields]), [fields]);

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <FieldsMetadataProvider fields={normalizedFields} services={services}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={i18n.translate('metricsExperience.gridAriaLabel', {
          defaultMessage: 'Metric charts grid. Use arrow keys to navigate.',
        })}
        aria-rowcount={gridRows}
        aria-colcount={gridColumns}
        onKeyDown={handleKeyDown}
        data-test-subj="unifiedMetricsExperienceGrid"
        tabIndex={0}
        style={{
          outline: 'none',
        }}
      >
        <EuiFlexGrid columns={columns} gutterSize="s">
          {rows.map(({ key, metric }, index) => {
            const { rowIndex, colIndex } = getRowColFromIndex(index);
            const isFocused =
              focusedCell.rowIndex === rowIndex && focusedCell.colIndex === colIndex;

            return (
              <EuiFlexItem key={key}>
                <div
                  role="gridcell"
                  aria-rowindex={rowIndex + 1} // 1-based for ARIA
                  aria-colindex={colIndex + 1} // 1-based for ARIA
                  data-grid-cell={`${rowIndex}-${colIndex}`}
                  data-chart-index={index}
                  tabIndex={isFocused ? 0 : -1}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCellClick(rowIndex, colIndex);
                    }
                  }}
                  style={{
                    outline: 'none',
                    cursor: 'pointer',
                    ...(isFocused && {
                      boxShadow: `inset 0 0 0 2px ${euiTheme.colors.primary}`,
                      borderRadius: euiTheme.border.radius.medium,
                    }),
                  }}
                >
                  <Chart
                    metric={metric}
                    size={chartSize}
                    color={colorPalette[index % colorPalette.length]}
                    dimensions={dimensions}
                    discoverFetch$={discoverFetch$}
                    requestParams={requestParams}
                    services={services}
                    abortController={abortController}
                    searchSessionId={searchSessionId}
                    filters={filters}
                    onBrushEnd={onBrushEnd}
                    onFilter={onFilter}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </div>
      {expandedMetric && (
        <MetricInsightsFlyout
          metric={expandedMetric.metric}
          esqlQuery={expandedMetric.esqlQuery}
          isOpen
          onClose={handleCloseFlyout}
        />
      )}
    </FieldsMetadataProvider>
  );
};
