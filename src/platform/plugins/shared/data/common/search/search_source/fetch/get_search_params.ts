/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { UI_SETTINGS } from '../../../constants';
import type { GetConfigFn } from '../../../types';
import type { SearchRequest } from './types';

const defaultSessionId = `${Date.now()}`;

export function getEsPreference(
  getConfigFn: GetConfigFn,
  sessionId = defaultSessionId
): SearchRequest['preference'] {
  const setPreference = getConfigFn<string>(UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE);
  if (setPreference === 'sessionId') return sessionId;
  const customPreference = getConfigFn<string>(UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE);
  return setPreference === 'custom' ? customPreference : undefined;
}

/** @public */
// TODO: Could provide this on runtime contract with dependencies
// already wired up.
export function getSearchParamsFromRequest(
  searchRequest: SearchRequest,
  dependencies: { getConfig: GetConfigFn }
): ISearchRequestParams {
  const { getConfig } = dependencies;
  const searchParams = { preference: getEsPreference(getConfig) };
  const dataView = typeof searchRequest.index !== 'string' ? searchRequest.index : undefined;
  const index = dataView?.title ?? `${searchRequest.index}`;
  const trackTotalHits = searchRequest.track_total_hits ?? searchRequest.body?.track_total_hits;

  // @ts-expect-error elasticsearch@9.0.0 `query` types don't match (it seems like it's been wrong here for a while)
  return {
    ...searchRequest,
    track_total_hits: trackTotalHits,
    index,
    ...(dataView?.getAllowHidden() && { expand_wildcards: 'all' }),
    ...searchParams,
  };
}
