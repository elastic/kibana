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
import type { DataViewLazy, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsService } from '@kbn/data-views-plugin/server';
import { omit } from 'lodash';

export class DataViewsAsCodeService {
  private dataViewsService: DataViewsService;

  constructor(dataViewsService: DataViewsService) {
    this.dataViewsService = dataViewsService;
  }

  private async mapDataView(dataView: DataViewLazy) {
    const dataViewAsCode = fromStoredDataViewToAsCodeSavedSchema(await dataView.toSpec());

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
    // The type assertion is necessary because the toStoredDataView function returns a string or DataViewSpec, but we
    // know for sure that in this case it will be a DataViewSpec, which is what the dataViewsService needs.
    const dataViewSpec = toStoredDataView(spec) as DataViewSpec;

    const result = await this.dataViewsService.createAndSaveDataViewLazy(dataViewSpec);

    return this.mapDataView(result);
  }
}
