/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsService, MatchedItem } from '.';

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
  getIndices: (props: {
    pattern: string;
    showAllIndices?: boolean;
    isRollupIndex: (indexName: string) => boolean;
  }) => Promise<MatchedItem[]>;
}

/**
 * Data Views public service
 * @public
 */
export class DataViewsServicePublic extends DataViewsService {
  public getCanSaveSync: () => boolean;

  public getIndices: (props: {
    pattern: string;
    showAllIndices?: boolean;
    isRollupIndex: (indexName: string) => boolean;
  }) => Promise<MatchedItem[]>;
  public hasData: HasDataService;

  /**
   * Constructor
   * @param deps Service dependencies
   */

  constructor(deps: DataViewsServicePublicDeps) {
    super(deps);
    this.getCanSaveSync = deps.getCanSaveSync;
    this.hasData = deps.hasData;
    this.getIndices = deps.getIndices;
  }
}
