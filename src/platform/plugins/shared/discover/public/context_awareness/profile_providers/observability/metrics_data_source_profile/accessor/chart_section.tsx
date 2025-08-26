/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { UnifiedHistogramMetricsExperienceGrid } from '@kbn/unified-metrics-grid';
import type { ChartSectionConfiguration } from '@kbn/unified-histogram';
import type { MetricsExperienceRepositoryClient } from '@kbn/metrics-experience-plugin/public';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const createChartSection =
  (
    metricsExperienceClient?: MetricsExperienceRepositoryClient
  ): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev: () => ChartSectionConfiguration) =>
  () => {
    return {
      ...(prev ? prev() : {}),
      Component: (props) => (
        <UnifiedHistogramMetricsExperienceGrid {...props} client={metricsExperienceClient} />
      ),
      replaceDefaultChart: !!metricsExperienceClient,
      localStorageKeyPrefix: 'discover:metricsExperience',
    };
  };
