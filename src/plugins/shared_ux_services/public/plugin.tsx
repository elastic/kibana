/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';

import {
  SharedUXServicesPluginSetup,
  SharedUXServicesPluginStart,
  SharedUXServicesPluginSetupDeps,
  SharedUXServicesPluginStartDeps,
} from './types';

import { SharedUXServicesProvider } from './services';
import { servicesFactory } from './services/kibana';

export class SharedUXServicesPlugin
  implements Plugin<SharedUXServicesPluginSetup, SharedUXServicesPluginStart>
{
  public setup(
    _coreSetup: CoreSetup<SharedUXServicesPluginStartDeps, SharedUXServicesPluginStart>,
    _setupPlugins: SharedUXServicesPluginSetupDeps
  ): SharedUXServicesPluginSetup {
    // Return methods that should be available to other plugins
    return {};
  }

  public start(
    coreStart: CoreStart,
    startPlugins: SharedUXServicesPluginStartDeps
  ): SharedUXServicesPluginStart {
    const services = servicesFactory({ coreStart, startPlugins });

    return {
      ServicesContext: ({ children }) => (
        <SharedUXServicesProvider {...services}>{children}</SharedUXServicesProvider>
      ),
    };
  }

  public stop() {}
}
