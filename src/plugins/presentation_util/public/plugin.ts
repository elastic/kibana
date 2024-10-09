/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  PresentationUtilPluginSetup,
  PresentationUtilPluginSetupDeps,
  PresentationUtilPluginStart,
  PresentationUtilPluginStartDeps,
} from './types';

import { registerExpressionsLanguage } from '.';
import { setKibanaServices } from './services/kibana_services';
import { getPresentationLabsService } from './services/presentation_labs_service';

export class PresentationUtilPlugin
  implements
    Plugin<
      PresentationUtilPluginSetup,
      PresentationUtilPluginStart,
      PresentationUtilPluginSetupDeps,
      PresentationUtilPluginStartDeps
    >
{
  public setup(
    _coreSetup: CoreSetup<PresentationUtilPluginStartDeps, PresentationUtilPluginStart>,
    _setupPlugins: PresentationUtilPluginSetupDeps
  ): PresentationUtilPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    startPlugins: PresentationUtilPluginStartDeps
  ): PresentationUtilPluginStart {
    setKibanaServices(coreStart, startPlugins);

    return {
      labsService: getPresentationLabsService(),
      registerExpressionsLanguage,
    };
  }

  public stop() {}
}
