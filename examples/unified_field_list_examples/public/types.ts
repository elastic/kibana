/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListExamplesPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListExamplesPluginStart {}

export interface AppPluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  uiActions: UiActionsStart;
}
