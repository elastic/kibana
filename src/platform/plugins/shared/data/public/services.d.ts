/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/common';
export declare const getUiSettings: import('@kbn/kibana-utils-plugin/common').Get<
  import('@kbn/core/public').IUiSettingsClient
>;
export const setUiSettings: import('@kbn/kibana-utils-plugin/common').Set<
  import('@kbn/core/public').IUiSettingsClient
>;
export declare const getOverlays: import('@kbn/kibana-utils-plugin/common').Get<
  import('@kbn/core/public').OverlayStart
>;
export const setOverlays: import('@kbn/kibana-utils-plugin/common').Set<
  import('@kbn/core/public').OverlayStart
>;
export declare const getIndexPatterns: import('@kbn/kibana-utils-plugin/common').Get<DataViewsContract>;
export const setIndexPatterns: import('@kbn/kibana-utils-plugin/common').Set<DataViewsContract>;
export declare const getHttp: import('@kbn/kibana-utils-plugin/common').Get<
  import('@kbn/core/public').HttpSetup
>;
export const setHttp: import('@kbn/kibana-utils-plugin/common').Set<
  import('@kbn/core/public').HttpSetup
>;
export declare const getSearchService: import('@kbn/kibana-utils-plugin/common').Get<
  import('./search').ISearchStart
>;
export const setSearchService: import('@kbn/kibana-utils-plugin/common').Set<
  import('./search').ISearchStart
>;
export declare const getTheme: import('@kbn/kibana-utils-plugin/common').Get<
  import('@kbn/core/public').ThemeServiceSetup
>;
export const setTheme: import('@kbn/kibana-utils-plugin/common').Set<
  import('@kbn/core/public').ThemeServiceSetup
>;
