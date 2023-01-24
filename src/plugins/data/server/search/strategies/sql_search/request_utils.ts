/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SqlGetAsyncRequest, SqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { ISearchOptions } from '../../../../common';
import { SearchConfigSchema } from '../../../../config';
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
  };
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
