/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { staticDataViewRoute } from './static_data_view';
import { dataViewIndexPatternRoute } from './data_view_index_pattern';

export const dataViewRouteDefinitions = {
  static: staticDataViewRoute,
  indexPattern: dataViewIndexPatternRoute,
};

export type { CreateDataViewResponse } from './static_data_view';
export type { DataViewIndexPatternResponse } from './data_view_index_pattern';
