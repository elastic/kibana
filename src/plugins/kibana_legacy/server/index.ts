/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, PluginConfigDescriptor } from 'kibana/server';
import { get } from 'lodash';

import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    defaultAppId: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    // TODO: Remove deprecation once defaultAppId is deleted
    renameFromRoot('kibana.defaultAppId', 'kibana_legacy.defaultAppId', { silent: true }),
    (completeConfig, rootPath, addDeprecation) => {
      if (
        get(completeConfig, 'kibana.defaultAppId') === undefined &&
        get(completeConfig, 'kibana_legacy.defaultAppId') === undefined
      ) {
        return;
      }
      addDeprecation({
        message: `kibana.defaultAppId is deprecated and will be removed in 8.0. Please use the \`defaultRoute\` advanced setting instead`,
        correctiveActions: {
          manualSteps: [
            'Go to Stack Management > Advanced Settings',
            'Update the "defaultRoute" setting under the General section',
            'Remove "kibana.defaultAppId" from the kibana.yml config file',
          ],
        },
      });
    },
  ],
};

class Plugin {
  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {}
}

export const plugin = () => new Plugin();
