/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { JsonCodeEditorProps } from './components';
export type { EsDocSearchProps } from './hooks';
export type { UnifiedDocViewerSetup, UnifiedDocViewerStart } from './plugin';

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedDocViewerStart } from './plugin';

export interface UnifiedDocViewerServices {
  analytics: AnalyticsServiceStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  storage: Storage;
  uiSettings: IUiSettingsClient;
  unifiedDocViewer: UnifiedDocViewerStart;
  share: SharePluginStart;
  core: CoreStart;
}
