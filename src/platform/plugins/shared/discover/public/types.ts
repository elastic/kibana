/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ComponentType } from 'react';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { AiopsPluginStart } from '@kbn/aiops-plugin/public';
import type { DataVisualizerPluginStart } from '@kbn/data-visualizer-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import { DiscoverAppLocator } from '../common';
import { DiscoverCustomizationContext } from './customizations';
import { type DiscoverContainerProps } from './components/discover_container';

/**
 * @public
 */
export interface DiscoverSetup {
  /**
   * `share` plugin URL locator for Discover app. Use it to generate links into
   * Discover application, for example, navigate:
   *
   * ```ts
   * await plugins.discover.locator.navigate({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   *
   * Generate a location:
   *
   * ```ts
   * const location = await plugins.discover.locator.getLocation({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   */
  readonly locator: undefined | DiscoverAppLocator;
  readonly showInlineTopNav: () => void;
  readonly configureInlineTopNav: (
    projectNavId: string,
    options: DiscoverCustomizationContext['inlineTopNav']
  ) => void;
}

export interface DiscoverStart {
  /**
   * `share` plugin URL locator for Discover app. Use it to generate links into
   * Discover application, for example, navigate:
   *
   * ```ts
   * await plugins.discover.locator.navigate({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   *
   * Generate a location:
   *
   * ```ts
   * const location = await plugins.discover.locator.getLocation({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   */
  readonly locator: undefined | DiscoverAppLocator;
  readonly DiscoverContainer: ComponentType<DiscoverContainerProps>;
}

/**
 * @internal
 */
export interface DiscoverSetupPlugins {
  data: DataPublicPluginSetup;
  dataViews: DataViewsServicePublic;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsSetup;
  globalSearch?: GlobalSearchPluginSetup;
  home?: HomePublicPluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  urlForwarding: UrlForwardingSetup;
}

/**
 * @internal
 */
export interface DiscoverStartPlugins {
  aiops?: AiopsPluginStart;
  charts: ChartsPluginStart;
  contentManagement: ContentManagementPublicStart;
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViews: DataViewsServicePublic;
  dataVisualizer?: DataVisualizerPluginStart;
  discoverShared: DiscoverSharedPublicStart;
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  inspector: InspectorPublicPluginStart;
  lens: LensPublicStart;
  logsDataAccess?: LogsDataAccessPluginStart;
  navigation: NavigationStart;
  noDataPage?: NoDataPagePluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  savedSearch: SavedSearchPublicPluginStart;
  share?: SharePluginStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedDocViewer: UnifiedDocViewerStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  urlForwarding: UrlForwardingStart;
  usageCollection?: UsageCollectionSetup;
}
