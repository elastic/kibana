/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EVENT_OUTCOME_FIELD,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_NAME_FIELD,
  TIMESTAMP_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
} from '../../../../../../common/data_types/logs/constants';
import { DataSourceCategory, type DataSourceProfileProvider } from '../../../../profiles';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { createChartSection } from '../accessors/chart_section';
import type { TracesDataContext } from '../profile';

export const createTracesAPMDataSourceProfileProvider = (
  tracesDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider => {
  const resolve: DataSourceProfileProvider['resolve'] = async (params) => {
    const baseResult = await tracesDataSourceProfileProvider.resolve(params);
    if (!baseResult.isMatch) {
      return baseResult;
    }
    const baseContext = baseResult.context as TracesDataContext;
    const {
      tracesDataSourcesSummary: { hasEcs, hasUnprocessedOtel },
    } = baseContext;

    // Avoid mixing APM and OTEL columns in the same profile
    // (activate only when the source is uniquely APM)
    if (hasEcs && !hasUnprocessedOtel) {
      // eslint-disable-next-line no-console
      console.log('[traces profile] APM sub-profile matched');
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Traces },
      };
    }

    return { isMatch: false };
  };

  return extendProfileProvider(tracesDataSourceProfileProvider, {
    profileId: 'observability-traces-apm-data-source-profile',
    profile: {
      getDefaultAppState: () => () => {
        return {
          columns: [
            { name: TIMESTAMP_FIELD, width: 212 },
            { name: SERVICE_NAME_FIELD },
            { name: TRANSACTION_NAME_FIELD },
            { name: SPAN_NAME_FIELD },
            { name: TRANSACTION_DURATION_FIELD },
            { name: SPAN_DURATION_FIELD },
            { name: EVENT_OUTCOME_FIELD },
          ],
          rowHeight: 1,
        };
      },
      getChartSectionConfiguration: createChartSection('apm'),
    },
    resolve,
  });
};
