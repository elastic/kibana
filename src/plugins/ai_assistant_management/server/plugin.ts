/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { AiAssistantManagementPluginSetup, AiAssistantManagementPluginStart } from './types';

export class AiAssistantManagementPlugin
  implements Plugin<AiAssistantManagementPluginSetup, AiAssistantManagementPluginStart, {}, {}>
{
  private readonly logger: Logger;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup({ http, capabilities }: CoreSetup) {
    this.logger.debug('Setting up AiAssistantManagement plugin');

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up AiAssistantManagement plugin');

    return {};
  }
}
