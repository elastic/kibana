/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import {
  SharedUXPluginSetup,
  SharedUXPluginStart,
  SharedUXPluginStartDeps,
  SharedUXPluginSetupDeps,
} from './types';

import { servicesFactory } from './services';

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
    const services = servicesFactory({ coreStart, startPlugins });

    return {
      getContextServices: () => services,
    };
  }

  public stop() {}
}
