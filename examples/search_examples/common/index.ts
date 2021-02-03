/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IEsSearchResponse, IEsSearchRequest } from '../../../src/plugins/data/common';

export const PLUGIN_ID = 'searchExamples';
export const PLUGIN_NAME = 'Search Examples';

export interface IMyStrategyRequest extends IEsSearchRequest {
  get_cool: boolean;
}
export interface IMyStrategyResponse extends IEsSearchResponse {
  cool: string;
}

export const SERVER_SEARCH_ROUTE_PATH = '/api/examples/search';
