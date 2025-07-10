/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OTEL_DURATION,
  OTEL_SPAN_KIND,
  OTEL_STATUS_CODE,
  SERVICE_NAME_FIELD,
  SPAN_NAME_FIELD,
  TIMESTAMP_FIELD,
} from '../../../../../../common/data_types/logs/constants';
import { DataSourceCategory, type DataSourceProfileProvider } from '../../../../profiles';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { extractIndexPatternFrom } from '../../../extract_index_pattern_from';
import { reContainsTracesApm, reContainsTracesOtel } from './reg_exps';

export const createTracesOtelDataSourceProfileProvider = (
  tracesDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider =>
  extendProfileProvider(tracesDataSourceProfileProvider, {
    profileId: 'observability-traces-otel-data-source-profile',
    profile: {
      getDefaultAppState: () => () => {
        return {
          columns: [
            { name: TIMESTAMP_FIELD, width: 212 },
            { name: SERVICE_NAME_FIELD },
            { name: SPAN_NAME_FIELD },
            { name: OTEL_DURATION },
            { name: OTEL_SPAN_KIND },
            { name: OTEL_STATUS_CODE },
          ],
          rowHeight: 1,
        };
      },
    },
    resolve,
  });

const resolve: DataSourceProfileProvider['resolve'] = (params) => {
  const indexPattern = extractIndexPatternFrom(params);

  const isOtelIndexPattern = reContainsTracesOtel.test(indexPattern || '');
  const isApmIndexPattern = reContainsTracesApm.test(indexPattern || '');

  // Avoid mixing APM and OTEL columns in the same profile
  if (isOtelIndexPattern && !isApmIndexPattern) {
    return {
      isMatch: true,
      context: { category: DataSourceCategory.Traces },
    };
  }

  return { isMatch: false };
};
