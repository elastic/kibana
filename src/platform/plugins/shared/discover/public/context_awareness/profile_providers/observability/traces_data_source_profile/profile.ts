/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, type DataSourceProfileProvider } from '../../../profiles';
import { getCellRenderers } from './accessors';

const OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID = 'observability-traces-data-source-profile';

export const createTracesDataSourceProfileProvider = (): DataSourceProfileProvider => ({
  profileId: OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID,
  isExperimental: true,
  profile: {
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: '@timestamp',
          width: 212,
        },
        {
          name: '_source',
        },
      ],
      rowHeight: 5,
    }),
    getCellRenderers,
  },
  resolve: ({ dataSource }) => {
    if (
      isDataSourceType(dataSource, DataSourceType.DataView) &&
      dataSource.dataViewId.includes('apm_static_data_view_id')
    ) {
      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Traces,
        },
      };
    }

    return { isMatch: false };
  },
});
