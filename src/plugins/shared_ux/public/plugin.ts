/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUxServices } from '@kbn/shared-ux-services';
import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import {
  SharedUXPluginSetup,
  SharedUXPluginStart,
  SharedUXPluginStartDeps,
  SharedUXPluginSetupDeps,
} from './types';

import { servicesFactory } from './services';

let services: SharedUxServices;
/**
 * The Kibana plugin for Shared User Experience (Shared UX).
 */
export class SharedUXPlugin implements Plugin<SharedUXPluginSetup, SharedUXPluginStart> {
  public setup(
    _coreSetup: CoreSetup<SharedUXPluginStartDeps, SharedUXPluginStart>,
    _setupPlugins: SharedUXPluginSetupDeps
  ): SharedUXPluginSetup {
    return {};
  }

  public start(coreStart: CoreStart, startPlugins: SharedUXPluginStartDeps): SharedUXPluginStart {
    services = servicesFactory({ coreStart, startPlugins });

    return {
      getContextServices: () => services,
    };
  }

  public stop() {}
}

export const getSharedUXServices = () => services;
