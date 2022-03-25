/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataViewsPublicPluginStart } from '../../data_views/public';
import type { FieldFormatsStart } from '../../field_formats/public';
import { IndexPatternSelectProps, StatefulSearchBarProps } from './index';
import type { DataPublicPluginStart } from '../../data/public';
import type { UiActionsSetup, UiActionsStart } from '../../ui_actions/public';

export interface UnifiedSearchSetupDependencies {
  uiActions: UiActionsSetup;
  data: DataPublicPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedSearchPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedSearchPluginStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppPluginStartDependencies {}

export interface UnifiedSearchStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
}

/**
 * Unified search plugin prewired UI components
 */
export interface UnifiedSearchPublicPluginStartUi {
  IndexPatternSelect: React.ComponentType<IndexPatternSelectProps>;
  SearchBar: React.ComponentType<StatefulSearchBarProps>;
}

/**
 * Unified search plugin public Start contract
 */
export interface UnifiedSearchPublicPluginStart {
  /**
   * prewired UI components
   * {@link DataPublicPluginStartUi}
   */
  ui: UnifiedSearchPublicPluginStartUi;
}
