/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeSavedDataView } from '@kbn/as-code-data-views-schema';
import {
  fromStoredDataViewToAsCodeSavedSchema,
  toStoredDataView,
} from '@kbn/as-code-data-views-transforms';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE, type DataViewLazy } from '@kbn/data-views-plugin/common';
import type { DataViewsService } from '@kbn/data-views-plugin/server';
import { omit } from 'lodash';

export class DataViewsAsCodeService {
  private dataViewsService: DataViewsService;
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(dataViewsService: DataViewsService, savedObjectsClient: SavedObjectsClientContract) {
    this.dataViewsService = dataViewsService;
    this.savedObjectsClient = savedObjectsClient;
  }

  private async mapDataView(dataView: DataViewLazy) {
    const dataViewSpec = await dataView.toSpec({ fieldParams: { fieldName: ['*'] } });
    const dataViewAsCode = fromStoredDataViewToAsCodeSavedSchema(dataViewSpec);

    return {
      id: dataView.id,
      data: omit(dataViewAsCode, 'id'),
      meta: {
        managed: dataView.managed,
        version: dataView.version,
        namespaces: dataView.namespaces,
      },
    };
  }

  public async search({
    page,
    perPage,
    search,
  }: {
    page?: number;
    perPage?: number;
    search?: string;
  }) {
    const result = await this.savedObjectsClient.find<DataViewAttributes>({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      page,
      perPage,
      search,
    });

    const dataViews = await Promise.all(
      result.saved_objects.map((so) =>
        this.dataViewsService
          .createDataViewLazy(this.dataViewsService.savedObjectToSpec(so))
          .then((dataView) => this.mapDataView(dataView))
      )
    );

    return {
      data: dataViews,
      meta: {
        page: result.page,
        per_page: result.per_page,
        total: result.total,
      },
    };
  }

  public async get(id: string) {
    const result = await this.dataViewsService.getDataViewLazy(id);
    return this.mapDataView(result);
  }

  public async create(spec: AsCodeSavedDataView) {
    const dataViewSpec = toStoredDataView(spec);

    const result = await this.dataViewsService.createAndSaveDataViewLazy(dataViewSpec);

    return this.mapDataView(result);
  }

  public delete(id: string) {
    return this.dataViewsService.delete(id);
  }
}
