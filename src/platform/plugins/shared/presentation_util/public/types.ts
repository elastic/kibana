/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type PresentationLabsService, registerExpressionsLanguage } from '.';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetup {}

export interface PresentationUtilPluginStart {
  labsService: PresentationLabsService;
  registerExpressionsLanguage: typeof registerExpressionsLanguage;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetupDeps {}

export interface PresentationUtilPluginStartDeps {
  contentManagement: ContentManagementPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}
