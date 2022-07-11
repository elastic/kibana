/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SqlGetAsyncRequest, SqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { ISearchOptions } from '../../../../common';
import { SearchSessionsConfigSchema } from '../../../../config';
import {
  getCommonDefaultAsyncGetParams,
  getCommonDefaultAsyncSubmitParams,
} from '../common/async_utils';

/**
 @internal
 */
export function getDefaultAsyncSubmitParams(
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Pick<SqlQueryRequest, 'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'> {
  return {
    ...getCommonDefaultAsyncSubmitParams(searchSessionsConfig, options),
  };
}

/**
 @internal
 */
export function getDefaultAsyncGetParams(
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Pick<SqlGetAsyncRequest, 'keep_alive' | 'wait_for_completion_timeout'> {
  return {
    ...getCommonDefaultAsyncGetParams(searchSessionsConfig, options),
  };
}
