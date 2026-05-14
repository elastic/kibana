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
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { DataSourceProfileProvider } from '../../../../profiles';
import { OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID } from '../profile';

export const getChartSectionConfiguration =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        const { query } = props.fetchParams;
        const groupByField =
          query && 'esql' in query
            ? getESQLStatsQueryMeta(query.esql).groupByFields?.[0]?.field
            : undefined;

        return (
          <TraceMetricsGrid
            key={groupByField ?? 'no-group'}
            profileId={OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID}
            {...props}
            actions={params.actions}
            breakdownField={groupByField}
          />
        );
      },
      replaceDefaultChart: true,
      defaultTopPanelHeight: 300,
    };
  };
