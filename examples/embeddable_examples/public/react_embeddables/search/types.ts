/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type {
  DefaultEmbeddableApi
} from '@kbn/embeddable-plugin/public';

export type Api = DefaultEmbeddableApi;

export type Services = {
  data: DataPublicPluginStart,
  dataViews: DataViewsPublicPluginStart,
}