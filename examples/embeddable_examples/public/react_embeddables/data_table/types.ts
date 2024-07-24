/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  PublishesDataLoading,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';

export type DataTableSerializedState = SerializedTitles & SerializedTimeRange;

export type DataTableRuntimeState = DataTableSerializedState;

export type DataTableApi = DefaultEmbeddableApi<DataTableSerializedState> & PublishesDataLoading;
