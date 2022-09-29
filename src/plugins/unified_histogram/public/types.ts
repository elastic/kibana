/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Theme } from '@kbn/charts-plugin/public/plugin';
import { IUiSettingsClient } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

export interface UnifiedHistogramServices {
  data: DataPublicPluginStart;
  theme: Theme;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
}

export type UnifiedHistogramStatus = 'loading' | 'complete' | 'partial' | 'error';

export type UnifiedHistogramLayoutStyle = 'fixed' | 'resizable';

export interface TimechartBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}
