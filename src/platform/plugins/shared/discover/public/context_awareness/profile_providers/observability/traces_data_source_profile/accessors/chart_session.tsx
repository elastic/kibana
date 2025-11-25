/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartSectionConfiguration } from '@kbn/unified-histogram';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { TraceMetricsGrid, type DataSource } from '@kbn/unified-metrics-grid';
import React from 'react';
import { once } from 'lodash';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const createChartSection = (
  dataSource: DataSource
): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  // prevents unmounting the component when the query changes but the index pattern is still valid
  once((prev: () => ChartSectionConfiguration) =>
    once((): ChartSectionConfiguration => {
      return {
        ...(prev ? prev() : {}),
        Component: (props: ChartSectionProps) => (
          <TraceMetricsGrid {...props} dataSource={dataSource} />
        ),
        replaceDefaultChart: true,
        defaultTopPanelHeight: 300,
      };
    })
  );
