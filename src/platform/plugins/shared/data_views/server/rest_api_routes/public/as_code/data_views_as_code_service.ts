/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStoredDataViewToAsCodeSavedSchema } from '@kbn/as-code-data-views-transforms';
import type { DataViewLazy, DataViewsService } from '../../../../common';

export class DataViewsAsCodeService {
  private dataViewsService: DataViewsService;

  constructor(dataViewsService: DataViewsService) {
    this.dataViewsService = dataViewsService;
  }

  private async mapDataView(dataView: DataViewLazy) {
    return {
      id: dataView.id,
      data: fromStoredDataViewToAsCodeSavedSchema(await dataView.toSpec()),
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
}
