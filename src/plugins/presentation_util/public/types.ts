/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { registerExpressionsLanguage } from '.';
import { PresentationLabsService } from './services/labs';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetup {}

export interface PresentationUtilPluginStart {
  ContextProvider: React.FC;
  labsService: PresentationLabsService;
  registerExpressionsLanguage: typeof registerExpressionsLanguage;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetupDeps {}

export interface PresentationUtilPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
}
