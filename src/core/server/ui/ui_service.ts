/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { PluginName } from '../plugins';
import { InternalUiServiceSetup, InternalUiServiceStart } from './types';

export class UiService {
  private readonly logger: Logger;
  private readonly requiredPlugins = new Set<PluginName>();
  private readonly appIdToPluginNameMap = new Map<string, PluginName>();

  constructor(core: CoreContext) {
    this.logger = core.logger.get('ui-service');
  }

  setup(): InternalUiServiceSetup {
    return {
      markAsRequired: (pluginName: PluginName) => {
        this.requiredPlugins.add(pluginName);
      },
      markAsRequiredFor: (pluginName: PluginName, ...pluginNames: PluginName[]) => {
        // TODO: implement
      },
      registerApp: (pluginName: PluginName, routeId: string) => {
        // TODO: check presence in map
        this.appIdToPluginNameMap.set(routeId, pluginName);
      },
    };
  }

  start(): InternalUiServiceStart {
    return {
      getPluginForApp: (appId: string) => {
        // TODO: handle missing entry
        return this.appIdToPluginNameMap.get(appId)!;
      },
    };
  }
}
