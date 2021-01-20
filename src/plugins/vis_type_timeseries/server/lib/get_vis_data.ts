/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FakeRequest, RequestHandlerContext } from 'kibana/server';
import _ from 'lodash';
import { first, map } from 'rxjs/operators';

import { Filter, Query } from 'src/plugins/data/common';
import { getPanelData } from './vis_data/get_panel_data';
import { Framework } from '../plugin';
import { ReqFacade } from './search_strategies/strategies/abstract_search_strategy';
import { TimeseriesVisData } from '../../common/types';

export interface GetVisDataOptions {
  timerange: {
    min: number | string;
    max: number | string;
    timezone?: string;
  };
  panels: unknown[];
  filters?: Filter[];
  state?: Record<string, unknown>;
  query?: Query | Query[];
  sessionId?: string;
}

export type GetVisData = (
  requestContext: RequestHandlerContext,
  options: GetVisDataOptions,
  framework: Framework
) => Promise<TimeseriesVisData>;

export function getVisData(
  requestContext: RequestHandlerContext,
  request: FakeRequest & { body: GetVisDataOptions },
  framework: Framework
): Promise<TimeseriesVisData> {
  // NOTE / TODO: This facade has been put in place to make migrating to the New Platform easier. It
  // removes the need to refactor many layers of dependencies on "req", and instead just augments the top
  // level object passed from here. The layers should be refactored fully at some point, but for now
  // this works and we are still using the New Platform services for these vis data portions.
  const reqFacade: ReqFacade<GetVisDataOptions> = {
    requestContext,
    ...request,
    framework,
    pre: {},
    payload: request.body,
    getUiSettingsService: () => requestContext.core.uiSettings.client,
    getSavedObjectsClient: () => requestContext.core.savedObjects.client,
    getEsShardTimeout: async () => {
      return await framework.globalConfig$
        .pipe(
          first(),
          map((config) => config.elasticsearch.shardTimeout.asMilliseconds())
        )
        .toPromise();
    },
    getIndexPatternsService: async () => {
      const [, { data }] = await framework.core.getStartServices();

      return await data.indexPatterns.indexPatternsServiceFactory(
        requestContext.core.savedObjects.client,
        requestContext.core.elasticsearch.client.asCurrentUser
      );
    },
  };
  const promises = reqFacade.payload.panels.map(getPanelData(reqFacade));
  return Promise.all(promises).then((res) => {
    return res.reduce((acc, data) => {
      return _.assign(acc as any, data);
    }, {});
  }) as Promise<TimeseriesVisData>;
}
