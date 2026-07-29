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
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { SavedObjectsErrorHelpers, type SavedObjectsClientContract } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE, type DataViewLazy } from '@kbn/data-views-plugin/common';
import type { DataViewsService } from '@kbn/data-views-plugin/server';
import { omit } from 'lodash';
import { getMeta } from '@kbn/as-code-shared-schemas';
import type { TypeOf } from '@kbn/config-schema';
import type { asCodePaginatedResponseSchema } from '../rest_routes/schema';

export class DataViewsAsCodeService {
  private dataViewsService: DataViewsService;
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(dataViewsService: DataViewsService, savedObjectsClient: SavedObjectsClientContract) {
    this.dataViewsService = dataViewsService;
    this.savedObjectsClient = savedObjectsClient;
  }

  private async mapDataView(dataView: DataViewLazy) {
    const dataViewSpec = await dataView.toMinimalSpec();
    if (dataView.getFieldAttrs().size > 0)
      dataViewSpec.fieldAttrs = Object.fromEntries(dataView.getFieldAttrs().entries());

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

  public async upsert(id: string, spec: Omit<AsCodeSavedDataView, 'id'>) {
    const existingDataView = await this.getDataViewLazy(id);

    if (!!existingDataView) {
      // The id can be a legacy alias, for that we use the resolved id.
      const resolvedId = existingDataView.id!;

      // 1. Create a new data view instance from the spec and update it.
      const dataViewInstance = await this.dataViewsService.createFromSpecLazy(
        toStoredDataView({ id: resolvedId, ...spec })
      );

      // 2. Update the saved object with the new data view instance.
      await this.savedObjectsClient.update(
        DATA_VIEW_SAVED_OBJECT_TYPE,
        resolvedId,
        dataViewInstance.getAsSavedObjectBody(),
        { mergeAttributes: false, refresh: true }
      );

      // 3 . Clear the data view service cache
      this.dataViewsService.clearInstanceCache(resolvedId);

      // 4. Return the updated data view.
      return {
        action: 'updated',
        // After that, it needs to be refetched, otherwise it won't get the meta fields correctly.
        body: await this.mapDataView(await this.dataViewsService.getDataViewLazy(resolvedId)),
      };
    }

    const createdDataView = await this.dataViewsService.createAndSaveDataViewLazy(
      toStoredDataView({ id, ...spec })
    );
    return { action: 'created', body: await this.mapDataView(createdDataView) };
  }

  private async getDataViewLazy(id: string) {
    try {
      return await this.dataViewsService.getDataViewLazy(id);
    } catch (e) {
      if (e instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }

  public async search({
    page,
    perPage,
    search,
  }: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<TypeOf<typeof asCodePaginatedResponseSchema>> {
    const result = await this.savedObjectsClient.find<DataViewAttributes>({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      page,
      perPage,
      search,
      fields: ['name', 'title', 'timeFieldName'],
    });

    /**
     * `search` reads directly from Saved Objects (instead of DataViewsService) to return a lightweight list view and map results to the as-code shape.
     * This enabled the use `getMeta` because these utils operate on saved-object fields.
     */
    const dataViews = result.saved_objects.map((so) => {
      return {
        id: so.id,
        data: {
          name: so.attributes.name,
          index_pattern: so.attributes.title,
          time_field: so.attributes.timeFieldName,
        },
        meta: {
          ...getMeta(so),
          namespaces: so.namespaces,
        },
      };
    });

    return {
      data: dataViews,
      meta: {
        page: result.page,
        per_page: result.per_page,
        total: result.total,
      },
    };
  }
}
