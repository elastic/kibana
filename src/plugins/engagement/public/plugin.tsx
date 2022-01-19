/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import type {
  EngagementPluginSetup,
  EngagementPluginStart,
  EngagementPluginSetupDeps,
  EngagementPluginStartDeps,
} from './types';
import { ServicesProvider } from './services';

// TODO: remove when config starts working.
const _config = {
  drift: {
    enabled: true,
    chatURL: 'https://elasticcloud-production-chat-us-east-1.s3.amazonaws.com/drift-iframe.html',
    pocID: '53877975',
    pocEmail: 'sergei.poluektov+drift-chat@elasticsearch.com',
    pocJWT:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1Mzg3Nzk3NSIsImV4cCI6MTY0MjUxNDc0Mn0.CcAZbD8R865UmoHGi27wKn0aH1bzkZXhX449yyDH2Vk',
  },
};

export interface EngagementConfigType {
  drift: {
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

  public setup(_core: CoreSetup): EngagementPluginSetup {
    return {};
  }

  public start(_core: CoreStart, plugins: EngagementPluginStartDeps): EngagementPluginStart {
    const { sharedUX } = plugins;

    // TODO: For some reason this isn't working.
    const config = this.initializerContext.config.get<EngagementConfigType>();
    const drift = config?.drift || _config.drift || { enabled: false };

    return {
      ContextProvider: ({ children }) => (
        <sharedUX.ServicesContext>
          <ServicesProvider drift={drift}>{children}</ServicesProvider>
        </sharedUX.ServicesContext>
      ),
    };
  }

  public stop() {}
}
