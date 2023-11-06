/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, DEFAULT_APP_CATEGORIES, Plugin } from '@kbn/core/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  // PluginStartContract as FeaturesPluginStart,
} from '@kbn/features-plugin/server';
import { FEATURE_PRIVILEGES_PLUGIN_ID } from '../common';

export interface FeatureControlExampleDeps {
  features: FeaturesPluginSetup;
}

export class FeatureControlsPluginExample
  implements Plugin<void, void, any, FeatureControlExampleDeps>
{
  public setup(core: CoreSetup, { features }: FeatureControlExampleDeps) {
    features.registerKibanaFeature({
      id: FEATURE_PRIVILEGES_PLUGIN_ID,
      name: 'Feature Plugin Examples',
      category: DEFAULT_APP_CATEGORIES.management,
      app: ['FeaturePluginExample'],
      privileges: {
        all: {
          app: ['FeaturePluginExample'],
          savedObject: {
            all: [],
            read: [],
          },
          api: ['my_closed_example_api'],
          ui: ['view', 'create', 'edit', 'delete', 'assign'],
        },
        read: {
          app: ['FeaturePluginExample'],
          savedObject: {
            all: [],
            read: ['tag'],
          },
          api: [],
          ui: ['view'],
        },
      },
    });

    const router = core.http.createRouter();
    router.get(
      {
        path: '/internal/my_plugin/read',
        validate: false,
      },
      async (context, request, response) => {
        return response.ok({
          body: {
            time: new Date().toISOString(),
          },
        });
      }
    );
    router.get(
      {
        path: '/internal/my_plugin/sensitive_action',
        validate: false,
        options: {
          tags: ['access:my_closed_example_api'],
        },
      },
      async (context, request, response) => {
        return response.ok({
          body: {
            time: new Date().toISOString(),
          },
        });
      }
    );
  }

  start() {
    return {};
  }
}
