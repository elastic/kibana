/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import {
  HasParentApi,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesUnifiedSearch,
  PublishesWritableUnifiedSearch,
} from '@kbn/presentation-publishing';

export interface State {
  timeRange: TimeRange | undefined;
}

export type Api = DefaultEmbeddableApi<State> &
  PublishesDataViews &
  PublishesDataLoading &
  Pick<PublishesWritableUnifiedSearch, 'timeRange$' | 'setTimeRange'> &
  Partial<HasParentApi<PublishesUnifiedSearch>>;

export interface Services {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}
