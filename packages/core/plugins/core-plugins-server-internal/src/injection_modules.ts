/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule } from 'inversify';
import { shareReplay } from 'rxjs/operators';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { loggerServiceId, configServiceId } from '@kbn/core-plugins-server';
import { pluginNameServiceId, pluginManifestServiceId } from '@kbn/core-di-common-internal';

export const buildPluginModule = (coreContext: CoreContext) => {
  return new ContainerModule((bind) => {
    // logger service
    bind(loggerServiceId).toDynamicValue(({ container }) => {
      const pluginName = container.get(pluginNameServiceId);
      return {
        get: (...contextParts: string[]) => {
          return coreContext.logger.get('plugins', pluginName, ...contextParts);
        },
      };
    });
    // plugin config service
    bind(configServiceId).toDynamicValue(({ container }) => {
      const manifest = container.get(pluginManifestServiceId);
      return {
        create<T>() {
          return coreContext.configService.atPath<T>(manifest.configPath).pipe(shareReplay(1));
        },
        get<T>() {
          return coreContext.configService.atPathSync<T>(manifest.configPath);
        },
      };
    });
  });
};
