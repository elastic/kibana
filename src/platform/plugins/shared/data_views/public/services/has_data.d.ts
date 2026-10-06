/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { ResponseErrorBody } from '@kbn/core-http-browser';
import type { ICPSManager } from '@kbn/cps-utils';
export interface HasEsDataParams {
  /**
   * Callback to handle the case where checking for remote data times out.
   * If not provided, the default behavior is to show a toast notification.
   * @param body The error response body
   */
  onRemoteDataTimeout?: (body: ResponseErrorBody) => void;
}
export declare class HasData {
  private removeAliases;
  private isUserDataSource;
  start(
    core: CoreStart,
    callResolveCluster: boolean,
    cpsManager?: ICPSManager
  ): {
    /**
     * Check to see if ES data exists
     */
    hasESData: ({ onRemoteDataTimeout }?: HasEsDataParams) => Promise<boolean>;
    /**
     * Check to see if a data view exists
     */
    hasDataView: () => Promise<boolean>;
    /**
     * Check to see if user created data views exist
     */
    hasUserDataView: () => Promise<boolean>;
  };
  private isResponseError;
  private responseToItemArray;
  private getIndicesViaSearch;
  private getIndices;
  private checkLocalESData;
  private checkRemoteESData;
  private getHasDataViews;
  private hasDataViews;
  private hasUserDataViews;
}
export type HasDataStart = ReturnType<HasData['start']>;
