/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { PublishesUnsavedChanges, SerializedTitles } from '@kbn/presentation-publishing';

export interface FieldListState {
  dataViewId?: string;
  selectedFieldNames?: string[];
}

export type FieldListRuntimeState = FieldListState & {
  dataViews?: DataView[];
};

export type FieldListSerializedState = SerializedTitles & FieldListState;

export type FieldListApi = DefaultEmbeddableApi<FieldListSerializedState> & PublishesUnsavedChanges;

export interface Services {
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
}
