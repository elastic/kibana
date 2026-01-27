/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TraceMetricsGrid } from '@kbn/unified-chart-section-viewer';
import React from 'react';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const getChartSectionConfiguration =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        return <TraceMetricsGrid {...props} actions={params.actions} />;
      },
      replaceDefaultChart: true,
      defaultTopPanelHeight: 300,
    };
  };
