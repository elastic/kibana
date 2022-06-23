/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { DataViewsService } from '.';

import { DataViewsServiceDeps } from '../common/data_views/data_views';
import { HasDataService } from '../common';

/**
 * Data Views public service dependencies
 * @public
 */
export interface DataViewsServicePublicDeps extends DataViewsServiceDeps {
  /**
   * Get can user save data view - sync version
   */
  getCanSaveSync: () => boolean;
  /**
   * Has data service
   */
  hasData: HasDataService;
  http: HttpStart;
}

/**
 * Data Views public service
 * @public
 */
export class DataViewsServicePublic extends DataViewsService {
  public getCanSaveSync: () => boolean;
  public hasData: HasDataService;
  public http: HttpStart;

  /**
   * Constructor
   * @param deps Service dependencies
   */

  constructor(deps: DataViewsServicePublicDeps) {
    super(deps);
    this.getCanSaveSync = deps.getCanSaveSync;
    this.hasData = deps.hasData;
    this.http = deps.http;
  }

  // todo better use of return type, less string usage
  async getDefaultDataView() {
    const { data_view_id: dataViewId } = await this.http.get<{ data_view_id?: string }>(
      '/api/data_views/default',
      {
        asSystemRequest: true,
      }
    );
    return dataViewId ? this.get(dataViewId) : null;
  }
}
