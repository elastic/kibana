/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '../../data/public';
import { PresentationLabsService } from './services/labs';
import { PresentationControlsService } from './services/controls';
import { DataViewsPublicPluginStart } from '../../data_views/public';
import { EmbeddableSetup, EmbeddableStart } from '../../embeddable/public';
import { registerExpressionsLanguage } from '.';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetup {}

export interface PresentationUtilPluginStart {
  ContextProvider: React.FC;
  labsService: PresentationLabsService;
  controlsService: PresentationControlsService;
  registerExpressionsLanguage: typeof registerExpressionsLanguage;
}

export interface PresentationUtilPluginSetupDeps {
  embeddable: EmbeddableSetup;
}
export interface PresentationUtilPluginStartDeps {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  dataViews: DataViewsPublicPluginStart;
}

export * from './components/controls';
