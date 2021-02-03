/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  ConfigDeprecationLogger,
  CoreSetup,
  CoreStart,
  PluginConfigDescriptor,
} from 'kibana/server';
import { get } from 'lodash';

import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    defaultAppId: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    // TODO: Remove deprecation once defaultAppId is deleted
    renameFromRoot('kibana.defaultAppId', 'kibana_legacy.defaultAppId', true),
    (completeConfig: Record<string, any>, rootPath: string, log: ConfigDeprecationLogger) => {
      if (
        get(completeConfig, 'kibana.defaultAppId') === undefined &&
        get(completeConfig, 'kibana_legacy.defaultAppId') === undefined
      ) {
        return completeConfig;
      }
      log(
        `kibana.defaultAppId is deprecated and will be removed in 8.0. Please use the \`defaultRoute\` advanced setting instead`
      );
      return completeConfig;
    },
  ],
};

class Plugin {
  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {}
}

export const plugin = () => new Plugin();
