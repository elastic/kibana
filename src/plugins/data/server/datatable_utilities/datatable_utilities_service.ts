/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  UiSettingsServiceStart,
} from 'src/core/server';
import type { FieldFormatsStart } from 'src/plugins/field_formats/server';
import type { IndexPatternsServiceStart } from 'src/plugins/data_views/server';
import { DatatableUtilitiesService as DatatableUtilitiesServiceCommon } from '../../common';
import type { AggsStart } from '../search';

export class DatatableUtilitiesService {
  constructor(
    private aggs: AggsStart,
    private dataViews: IndexPatternsServiceStart,
    private fieldFormats: FieldFormatsStart,
    private uiSettings: UiSettingsServiceStart
  ) {
    this.asScopedToClient = this.asScopedToClient.bind(this);
  }

  async asScopedToClient(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ): Promise<DatatableUtilitiesServiceCommon> {
    const aggs = await this.aggs.asScopedToClient(savedObjectsClient, elasticsearchClient);
    const dataViews = await this.dataViews.dataViewsServiceFactory(
      savedObjectsClient,
      elasticsearchClient
    );
    const uiSettings = this.uiSettings.asScopedToClient(savedObjectsClient);
    const fieldFormats = await this.fieldFormats.fieldFormatServiceFactory(uiSettings);

    return new DatatableUtilitiesServiceCommon(aggs, dataViews, fieldFormats);
  }
}
