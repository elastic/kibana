/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasParentApi,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesUnifiedSearch,
  PublishesWritableUnifiedSearch,
  SerializedTimeRange,
} from '@kbn/presentation-publishing';

export type SearchSerializedState = SerializedTimeRange;

export type SearchRuntimeState = SearchSerializedState;

export type SearchApi = DefaultEmbeddableApi<SearchSerializedState> &
  PublishesDataViews &
  PublishesDataLoading &
  Pick<PublishesWritableUnifiedSearch, 'timeRange$' | 'setTimeRange'> &
  Partial<HasParentApi<PublishesUnifiedSearch>>;

export interface Services {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}
