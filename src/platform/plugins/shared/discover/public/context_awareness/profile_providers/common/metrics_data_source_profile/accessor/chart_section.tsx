/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { UnifiedMetricsExperienceGrid } from '@kbn/unified-chart-section-viewer';
import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const createChartSection =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        // This will prevent the filter being added to the query for multi-dimensional breakdowns when the user clicks on a data point on the series.
        const handleFilter = (event: ExpressionRendererEvent['data']) => {
          if (props.onFilter) {
            props.onFilter(event);
          }
          event.preventDefault();
        };
        return (
          <UnifiedMetricsExperienceGrid
            {...props}
            onFilter={handleFilter}
            actions={params.actions}
          />
        );
      },
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      defaultTopPanelHeight: 'max-content',
    };
  };
