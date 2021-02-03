/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import { IUiSettingsClient, IScopedClusterClient, SharedGlobalConfig } from 'src/core/server';

import type { MsearchRequestBody, MsearchResponse } from '../../../common/search/search_source';
import { getKbnServerError } from '../../../../kibana_utils/server';
import { getShardTimeout, getDefaultSearchParams, shimAbortSignal, shimHitsTotal } from '..';

/** @internal */
export function convertRequestBody(
  requestBody: MsearchRequestBody,
  { timeout }: { timeout?: string }
): string {
  return requestBody.searches.reduce((req, curr) => {
    const header = JSON.stringify({
      ignore_unavailable: true,
      ...curr.header,
    });
    const body = JSON.stringify({
      timeout,
      ...curr.body,
    });
    return `${req}${header}\n${body}\n`;
  }, '');
}

interface CallMsearchDependencies {
  esClient: IScopedClusterClient;
  globalConfig$: Observable<SharedGlobalConfig>;
  uiSettings: IUiSettingsClient;
}

/**
 * Helper for the `/internal/_msearch` route, exported separately here
 * so that it can be reused elsewhere in the data plugin on the server,
 * e.g. SearchSource
 *
 * @internal
 */
export function getCallMsearch(dependencies: CallMsearchDependencies) {
  /**
   * @throws KbnServerError
   */
  return async (params: {
    body: MsearchRequestBody;
    signal?: AbortSignal;
  }): Promise<MsearchResponse> => {
    const { esClient, globalConfig$, uiSettings } = dependencies;

    // get shardTimeout
    const config = await globalConfig$.pipe(first()).toPromise();
    const timeout = getShardTimeout(config);

    // trackTotalHits is not supported by msearch
    const { track_total_hits: _, ...defaultParams } = await getDefaultSearchParams(uiSettings);

    try {
      const promise = esClient.asCurrentUser.msearch(
        {
          body: convertRequestBody(params.body, timeout),
        },
        {
          querystring: defaultParams,
        }
      );
      const response = await shimAbortSignal(promise, params.signal);

      return {
        body: {
          ...response,
          body: {
            responses: response.body.responses?.map((r: SearchResponse<unknown>) =>
              shimHitsTotal(r)
            ),
          },
        },
      };
    } catch (e) {
      throw getKbnServerError(e);
    }
  };
}
