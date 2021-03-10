/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, IUiSettingsClient, KibanaRequest } from 'src/core/server';
import type {
  DataRequestHandlerContext,
  EsQueryConfig,
  IndexPatternsService,
} from 'src/plugins/data/server';
import { VisPayload } from '../common/types';
import { SearchStrategyRegistry } from './lib/search_strategies';

export type VisTypeTimeseriesRequestHandlerContext = DataRequestHandlerContext;
export type VisTypeTimeseriesRouter = IRouter<VisTypeTimeseriesRequestHandlerContext>;
export type VisTypeTimeseriesVisDataRequest = KibanaRequest<{}, {}, VisPayload>;
export type VisTypeTimeseriesFieldsRequest = KibanaRequest<{}, { index: string }, {}>;
export type VisTypeTimeseriesRequest =
  | VisTypeTimeseriesFieldsRequest
  | VisTypeTimeseriesVisDataRequest;

export interface VisTypeTimeseriesRequestServices {
  esShardTimeout: number;
  esQueryConfig: EsQueryConfig;
  uiSettings: IUiSettingsClient;
  indexPatternsService: IndexPatternsService;
  searchStrategyRegistry: SearchStrategyRegistry;
}
