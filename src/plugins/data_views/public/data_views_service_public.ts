/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsService } from '.';

import { DataViewsServiceDeps } from '../common/data_views/data_views';

interface DataViewsServicePublicDeps extends DataViewsServiceDeps {
  getCanSaveSync: () => boolean;
}

export class DataViewsServicePublic extends DataViewsService {
  public getCanSaveSync: () => boolean;

  constructor(deps: DataViewsServicePublicDeps) {
    super(deps);
    this.getCanSaveSync = deps.getCanSaveSync;
  }
}
