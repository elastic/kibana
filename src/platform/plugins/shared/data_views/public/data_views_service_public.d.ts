/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { MatchedItem } from '.';
import { DataViewsService } from '.';
import type { DataViewsServiceDeps } from '../common/data_views/data_views';
import type { HasDataService } from '../common';
import type { ExistingIndicesResponse } from '../common/types';
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
    projectRouting?: string;
  }) => Promise<MatchedItem[]>;
  getRollupsEnabled: () => boolean;
  scriptedFieldsEnabled: boolean;
  http: HttpStart;
}
/**
 * Data Views public service
 * @public
 */
export declare class DataViewsServicePublic extends DataViewsService {
  getCanSaveSync: () => boolean;
  getIndices: (props: {
    pattern: string;
    showAllIndices?: boolean;
    isRollupIndex: (indexName: string) => boolean;
    projectRouting?: string;
  }) => Promise<MatchedItem[]>;
  hasData: HasDataService;
  private rollupsEnabled;
  private readonly http;
  readonly scriptedFieldsEnabled: boolean;
  /**
   * Constructor
   * @param deps Service dependencies
   */
  constructor(deps: DataViewsServicePublicDeps);
  getRollupsEnabled(): boolean;
  /**
   * Get existing index pattern list by providing string array index pattern list.
   * @param indices - index pattern list
   * @returns index pattern list of index patterns that match indices
   */
  getExistingIndices(indices: string[]): Promise<ExistingIndicesResponse>;
}
