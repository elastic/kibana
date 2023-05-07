/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { OpenAiPluginSetup, OpenAiPluginStart } from './types';
import { defineRoutes } from './routes';
import type { OpenAiConfig } from './config';

export class OpenAiPlugin implements Plugin<OpenAiPluginSetup, OpenAiPluginStart> {
  private readonly config: OpenAiConfig;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<OpenAiConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    core.uiSettings.registerGlobal({
      ['openAI:apiKey']: {
        name: i18n.translate('openAI.apiKeySettingName', {
          defaultMessage: 'API key',
        }),
        value: null,
        description: i18n.translate('openAI.apiKeySettingName', {
          defaultMessage: 'The API key Kibana should use to authenticate with OpenAI.',
        }),
        sensitive: true,
        type: 'string',
        order: 1,
        requiresPageReload: true,
        schema: schema.nullable(schema.string()),
        category: ['Open AI'],
      },
    });

    // Register server side APIs
    defineRoutes({ core, config: this.config });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('openAI: Started');
    return {};
  }

  public stop() {}
}
