/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';

export type { JsonCodeEditorProps } from './components';
export type { EsDocSearchProps } from './hooks';
export type { UnifiedDocViewerSetup, UnifiedDocViewerStart } from './plugin';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { IToasts } from '@kbn/core/public';
import type { LensRendererProps } from '@kbn/lens-common';
import type { UnifiedDocViewerStart } from './plugin';

// Local type definition to avoid circular dependency when importing LensPublicStart:
// unified_doc_viewer -> lens -> esql_datagrid -> unified_doc_viewer
// We only need EmbeddableComponent, so we define a minimal interface
export interface LensService {
  EmbeddableComponent?: React.ComponentType<LensRendererProps>;
}

export interface UnifiedDocViewerServices {
  analytics: AnalyticsServiceStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  toasts: IToasts;
  storage: Storage;
  uiSettings: IUiSettingsClient;
  unifiedDocViewer: UnifiedDocViewerStart;
  share: SharePluginStart;
  core: CoreStart;
  discoverShared: DiscoverSharedPublicStart;
  lens: LensService;
}
