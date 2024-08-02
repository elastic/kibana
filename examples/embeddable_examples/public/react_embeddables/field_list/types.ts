/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { PublishesDataViews, SerializedTitles } from '@kbn/presentation-publishing';
import { PublishesSelectedFields } from './publishes_selected_fields';

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
