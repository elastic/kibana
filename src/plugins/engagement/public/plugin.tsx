/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import type {
  EngagementPluginSetup,
  EngagementPluginStart,
  EngagementPluginSetupDeps,
  EngagementPluginStartDeps,
} from './types';
import { ServicesProvider } from './services';

export interface EngagementConfigType {
  chat: {
    enabled: boolean;
    chatURL: string;

    // These are here for PoC purposes *only*.  They should be replaced with actual implementations
    // as the PoC matures.
    pocJWT: string;
    pocID: string;
    pocEmail: string;
  };
}

export class EngagementPlugin
  implements
    Plugin<
      EngagementPluginSetup,
      EngagementPluginStart,
      EngagementPluginSetupDeps,
      EngagementPluginStartDeps
    >
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(): EngagementPluginSetup {
    return {};
  }

  public start(_core: CoreStart, plugins: EngagementPluginStartDeps): EngagementPluginStart {
    const { sharedUX } = plugins;

    const config = this.initializerContext.config.get<EngagementConfigType>();
    const chat = config?.chat || { enabled: false };

    return {
      ContextProvider: ({ children }) => (
        <sharedUX.ServicesContext>
          <ServicesProvider chat={chat}>{children}</ServicesProvider>
        </sharedUX.ServicesContext>
      ),
    };
  }

  public stop() {}
}
