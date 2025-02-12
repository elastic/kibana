/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpStart } from '@kbn/core/public';
import { DataViewsService, MatchedItem } from '.';

import { DataViewsServiceDeps } from '../common/data_views/data_views';
import { HasDataService } from '../common';

import { ExistingIndicesResponse } from '../common/types';
import { EXISTING_INDICES_PATH } from '../common/constants';

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

  getRollupsEnabled: () => boolean;
  scriptedFieldsEnabled: boolean;
  http: HttpStart;
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
  private rollupsEnabled: boolean = false;
  private readonly http: HttpStart;
  public readonly scriptedFieldsEnabled: boolean;

  /**
   * Constructor
   * @param deps Service dependencies
   */

  constructor(deps: DataViewsServicePublicDeps) {
    super(deps);
    this.getCanSaveSync = deps.getCanSaveSync;
    this.hasData = deps.hasData;
    this.getIndices = deps.getIndices;
    this.rollupsEnabled = deps.getRollupsEnabled();
    this.scriptedFieldsEnabled = deps.scriptedFieldsEnabled;
    this.http = deps.http;
  }

  getRollupsEnabled() {
    return this.rollupsEnabled;
  }

  /**
   * Get existing index pattern list by providing string array index pattern list.
   * @param indices - index pattern list
   * @returns index pattern list of index patterns that match indices
   */
  async getExistingIndices(indices: string[]): Promise<ExistingIndicesResponse> {
    return this.http.get<ExistingIndicesResponse>(EXISTING_INDICES_PATH, {
      query: { indices },
      version: '1',
    });
  }
}
