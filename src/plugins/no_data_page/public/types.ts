/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type GetAnalyticsNoDataPageFlavor = () =>
  | 'kibana'
  | 'serverless_search'
  | 'serverless_observability';

export interface HasApiKeysResponseData {
  hasApiKeys: boolean;
}

export interface HasApiKeysResponse {
  hasApiKeys: boolean | null;
  loading: boolean;
  error: Error | null;
}

export interface NoDataPagePluginSetup {
  getAnalyticsNoDataPageFlavor: GetAnalyticsNoDataPageFlavor;
  /**
   * The response can be stubbed with null as a default, if the No Data Page is unavailable
   */
  useHasApiKeys: () => HasApiKeysResponse | null;
}

export type NoDataPagePluginStart = NoDataPagePluginSetup;
