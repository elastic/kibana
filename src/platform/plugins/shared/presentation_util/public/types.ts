/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { registerExpressionsLanguage } from '.';
import { type PresentationLabsService } from '.';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetup {}

export interface PresentationUtilPluginStart {
  labsService: PresentationLabsService;
  registerExpressionsLanguage: typeof registerExpressionsLanguage;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetupDeps {}

export interface PresentationUtilPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}
