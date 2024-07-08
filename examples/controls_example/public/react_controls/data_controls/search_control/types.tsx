/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataControlApi, DefaultDataControlState } from '../types';

export const SEARCH_CONTROL_TYPE = 'searchControl';

export type SearchControlTechniques = 'match' | 'simple_query_string';

export interface SearchControlState extends DefaultDataControlState {
  searchString?: string;
  searchTechnique?: SearchControlTechniques;
}

export type SearchControlApi = DataControlApi;
