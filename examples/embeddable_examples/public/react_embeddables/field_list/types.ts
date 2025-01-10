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
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { PublishesDataViews, SerializedTitles } from '@kbn/presentation-publishing';
import type { PublishesSelectedFields } from './publishes_selected_fields';

export type FieldListSerializedStateState = SerializedTitles & {
  dataViewId?: string;
  selectedFieldNames?: string[];
};

export type FieldListRuntimeState = FieldListSerializedStateState;

export type FieldListApi = DefaultEmbeddableApi<
  FieldListSerializedStateState,
  FieldListSerializedStateState
> &
  PublishesSelectedFields &
  PublishesDataViews;

export interface Services {
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
}
