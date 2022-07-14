/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart, IUiSettingsClient } from '@kbn/core/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListPluginStart {}

export interface UnifiedFieldListServices {
  http: HttpStart;
  uiSettings: IUiSettingsClient;
  dataViews: DataViewsContract;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
}
