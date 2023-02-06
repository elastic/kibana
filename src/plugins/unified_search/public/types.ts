/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { Query, AggregateQuery } from '@kbn/es-query';
import { CoreStart, DocLinksStart } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { AutocompleteSetup, AutocompleteStart } from './autocomplete';
import type { IndexPatternSelectProps, StatefulSearchBarProps } from '.';

export interface UnifiedSearchSetupDependencies {
  uiActions: UiActionsSetup;
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionSetup;
}

export interface UnifiedSearchPluginSetup {
  autocomplete: AutocompleteSetup;
}

export interface UnifiedSearchStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  screenshotMode?: ScreenshotModePluginStart;
}

/**
 * Unified search plugin prewired UI components
 */
export interface UnifiedSearchPublicPluginStartUi {
  IndexPatternSelect: React.ComponentType<IndexPatternSelectProps>;
  SearchBar: (props: StatefulSearchBarProps<Query>) => React.ReactElement;
  AggregateQuerySearchBar: <QT extends Query | AggregateQuery = Query>(
    props: StatefulSearchBarProps<QT>
  ) => React.ReactElement;
}

/**
 * Unified search plugin public Start contract
 */
export interface UnifiedSearchPublicPluginStart {
  /**
   * autocomplete service
   * {@link AutocompleteStart}
   */
  autocomplete: AutocompleteStart;
  /**
   * prewired UI components
   * {@link UnifiedSearchPublicPluginStartUi}
   */
  ui: UnifiedSearchPublicPluginStartUi;
}

/**
 * Filter options from Unified Search menu panels
 */
export type FilterPanelOption =
  | 'pinFilter'
  | 'editFilter'
  | 'negateFilter'
  | 'disableFilter'
  | 'deleteFilter';

export interface IUnifiedSearchPluginServices extends Partial<CoreStart> {
  unifiedSearch: {
    autocomplete: AutocompleteStart;
  };
  appName: string;
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  storage: IStorageWrapper;
  docLinks: DocLinksStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  usageCollection?: UsageCollectionStart;
}
