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
    (completeConfig, rootPath, addDeprecation) => {
      const hasKibanaDefaultAppId = get(completeConfig, 'kibana.defaultAppId') !== undefined;
      const hasKibanaLegacyDefaultAppId =
        get(completeConfig, 'kibana_legacy.defaultAppId') !== undefined;
      if (!hasKibanaDefaultAppId && !hasKibanaLegacyDefaultAppId) {
        return;
      }
      const configPath = hasKibanaDefaultAppId
        ? 'kibana.defaultAppId'
        : 'kibana_legacy.defaultAppId';
      addDeprecation({
        configPath,
        message: `${configPath} is deprecated and will be removed in 8.0. Please use the \`defaultRoute\` advanced setting instead`,
        correctiveActions: {
          manualSteps: [
            'Go to Stack Management > Advanced Settings',
            'Update the "defaultRoute" setting under the General section',
            `Remove "${configPath}" from the kibana.yml config file`,
          ],
        },
      });
      if (hasKibanaDefaultAppId) {
        return {
          set: [
            {
              path: 'kibana_legacy.defaultAppId',
              value: get(completeConfig, 'kibana.defaultAppId'),
            },
          ],
          unset: [{ path: 'kibana.defaultAppId' }],
        };
      }
    },
  ],
};

class Plugin {
  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {}
}

export const plugin = () => new Plugin();
