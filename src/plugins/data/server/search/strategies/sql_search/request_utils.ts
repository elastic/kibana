/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/server';
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
export async function getDefaultAsyncSubmitParams(
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>,
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Promise<
  Pick<SqlQueryRequest, 'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'>
> {
  return {
    ...(await getCommonDefaultAsyncSubmitParams(uiSettingsClient, searchSessionsConfig, options)),
  };
}

/**
 @internal
 */
export async function getDefaultAsyncGetParams(
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>,
  searchSessionsConfig: SearchSessionsConfigSchema | null,
  options: ISearchOptions
): Promise<Pick<SqlGetAsyncRequest, 'keep_alive' | 'wait_for_completion_timeout'>> {
  return {
    ...(await getCommonDefaultAsyncGetParams(uiSettingsClient, searchSessionsConfig, options)),
  };
}
