/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsQueryConfig } from '@kbn/es-query';
import type { GetConfigFn } from '../types';
import { UI_SETTINGS } from '../constants';

interface KibanaConfig {
  get: GetConfigFn;
}

interface AsyncKibanaConfig {
  get: <T = any>(key: string) => Promise<T>;
}

export function getEsQueryConfig(config: KibanaConfig): EsQueryConfig {
  const allowLeadingWildcards = config.get(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS);
  const queryStringOptions = config.get(UI_SETTINGS.QUERY_STRING_OPTIONS);
  const ignoreFilterIfFieldNotInIndex = config.get(
    UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX
  );
  const dateFormatTZ = config.get('dateFormat:tz');

  return {
    allowLeadingWildcards,
    queryStringOptions,
    ignoreFilterIfFieldNotInIndex,
    dateFormatTZ,
  };
}

/**
 * Async variant of `getEsQueryConfig` for config sources whose `get` returns a promise
 * (for example the server-side `IUiSettingsClient`). Reads only the settings the query config needs.
 */
export async function getEsQueryConfigAsync(config: AsyncKibanaConfig): Promise<EsQueryConfig> {
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex, dateFormatTZ] =
    await Promise.all([
      config.get(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS),
      config.get(UI_SETTINGS.QUERY_STRING_OPTIONS),
      config.get(UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX),
      config.get('dateFormat:tz'),
    ]);

  return {
    allowLeadingWildcards,
    queryStringOptions,
    ignoreFilterIfFieldNotInIndex,
    dateFormatTZ,
  };
}
