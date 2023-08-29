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

export interface FeatureControlExampleDeps {
  features: FeaturesPluginSetup;
}

export class MyFeaturePlugin implements Plugin<void, void, any, FeatureControlExampleDeps> {
  public setup(core: CoreSetup, { features }: FeatureControlExampleDeps) {
    const router = core.http.createRouter();
    // features.registerKibanaFeature({
    //   id: 'MyFeaturePLuginIsNeeded',
    //   name: 'FeaturePLuginExample',
    //   category: DEFAULT_APP_CATEGORIES.management,
    //   app: [],
    //   privileges: {
    //     all: {
    //       app: [],
    //       api: [],
    //       catalogue: [],
    //       management: {
    //         insightsAndAlerting: ['triggersActions', 'triggersActionsConnectors'],
    //       },
    //       savedObject: {
    //         all: [],
    //         read: [],
    //       },
    //       ui: ['show', 'execute', 'save', 'delete'],
    //     },
    //     read: {
    //       app: [],
    //       api: [],
    //       catalogue: [],
    //       management: {
    //         insightsAndAlerting: ['triggersActions', 'triggersActionsConnectors'],
    //       },
    //       savedObject: {
    //         // action execution requires 'read' over `actions`, but 'all' over `action_task_params`
    //         all: [],
    //         read: [],
    //       },
    //       ui: ['show', 'execute'],
    //     },
    //   },
    // });
    router.get(
      {
        path: '/internal/my_plugin/example',
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
  }

  start() {
    return {};
  }

  stop() {
    return {};
  }
}
