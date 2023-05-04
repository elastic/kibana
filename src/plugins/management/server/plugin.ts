/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import { ManagementAppLocatorDefinition, ManagementAppLocatorParams } from '../common/locator';
import { capabilitiesProvider } from './capabilities_provider';

interface ManagementSetupDependencies {
  share: SharePluginSetup;
}

export interface ManagementSetup {
  locator: LocatorPublic<ManagementAppLocatorParams>;
}

export class ManagementServerPlugin
  implements Plugin<ManagementSetup, object, ManagementSetupDependencies>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { share }: ManagementSetupDependencies) {
    this.logger.debug('management: Setup');

    const locator = share.url.locators.create(new ManagementAppLocatorDefinition());

    core.capabilities.registerProvider(capabilitiesProvider);

    return {
      locator,
    };
  }

  public start(core: CoreStart) {
    this.logger.debug('management: Started');
    return {};
  }

  public stop() {}
}
