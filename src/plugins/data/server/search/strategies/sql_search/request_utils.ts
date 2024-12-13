/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SqlGetAsyncRequest, SqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { ISearchOptions } from '@kbn/search-types';
import { SearchConfigSchema } from '../../../config';
import {
  getCommonDefaultAsyncGetParams,
  getCommonDefaultAsyncSubmitParams,
} from '../common/async_utils';

/**
 @internal
 */
export function getDefaultAsyncSubmitParams(
  searchConfig: SearchConfigSchema,
  options: ISearchOptions
): Pick<SqlQueryRequest, 'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'> {
  return {
    ...getCommonDefaultAsyncSubmitParams(searchConfig, options, {
      /**
       * force disable search sessions until sessions support SQL
       * https://github.com/elastic/kibana/issues/127880
       */
      disableSearchSessions: true,
    }),
  } as Pick<SqlQueryRequest, 'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'>;
}

/**
 @internal
 */
export function getDefaultAsyncGetParams(
  searchConfig: SearchConfigSchema,
  options: ISearchOptions
): Pick<SqlGetAsyncRequest, 'keep_alive' | 'wait_for_completion_timeout'> {
  return {
    ...getCommonDefaultAsyncGetParams(searchConfig, options, {
      /**
       * force disable search sessions until sessions support SQL
       * https://github.com/elastic/kibana/issues/127880
       */
      disableSearchSessions: true,
    }),
  };
}
