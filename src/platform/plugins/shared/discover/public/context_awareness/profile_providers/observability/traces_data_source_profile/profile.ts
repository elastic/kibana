/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';

export const createTracesDataSourceProfileProvider = (): DataSourceProfileProvider => ({
  profileId: 'traces-data-source-profile',
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
  },
  resolve: ({ dataSource }) => {
    if (
      isDataSourceType(dataSource, DataSourceType.DataView) &&
      dataSource.dataViewId === 'apm_static_data_view_id_default'
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
