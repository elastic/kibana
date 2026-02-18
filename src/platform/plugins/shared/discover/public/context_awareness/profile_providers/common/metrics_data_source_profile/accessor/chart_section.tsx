/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  UnifiedMetricsExperienceGrid,
  categorizeFields,
  MetricsCountLabel,
} from '@kbn/unified-chart-section-viewer';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const createChartSection =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        return <UnifiedMetricsExperienceGrid {...props} actions={params.actions} />;
      },
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      defaultTopPanelHeight: 'max-content',
      renderCollapsedTitle: (fetchParams) => {
        const { dataView, table } = fetchParams;
        const { metricFields } = categorizeFields({
          index: dataView.getIndexPattern(),
          dataViewFieldMap: dataView.fields.toSpec(),
          columns: table?.columns,
        });
        if (metricFields.length === 0) {
          return null;
        }
        return <MetricsCountLabel count={metricFields.length} />;
      },
    };
  };
