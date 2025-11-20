/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceCategory } from '../../../profiles';
import { type DataSourceProfileProvider } from '../../../profiles';
import { DEPRECATION_LOGS_PATTERN_PREFIX, DEPRECATION_LOGS_PROFILE_ID } from './consts';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';

export const createDeprecationLogsDataSourceProfileProvider =
  (): DataSourceProfileProvider<{}> => ({
    profileId: DEPRECATION_LOGS_PROFILE_ID,
    profile: {
      getDefaultAppState: () => () => ({
        columns: [
          { name: 'log.level', width: 150 },
          { name: 'message' },
          { name: 'elasticsearch.http.request.x_opaque_id', width: 250 },
          { name: 'elasticsearch.cluster.name', width: 250 },
          { name: 'elasticsearch.event.category', width: 250 },
        ],
      }),
    },
    resolve: (params) => {
      const indexPattern = extractIndexPatternFrom(params);

      if (!checkAllIndicesInPatternAreDeprecationLogs(indexPattern)) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Logs,
        },
      };
    },
  });

/*
  This function returns true if the index pattern belongs to deprecation logs.
  It also considers multiple patterns separated by commas.
*/
const checkAllIndicesInPatternAreDeprecationLogs = (indexPattern: string | null): boolean => {
  if (!indexPattern) {
    return false;
  }
  const indexPatternArray = indexPattern.split(',');
  const result = indexPatternArray.reduce(
    (acc, val) => acc && val.startsWith(DEPRECATION_LOGS_PATTERN_PREFIX),
    true
  );
  return result;
};
