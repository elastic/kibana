/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { defineRoutes } from './routes';
import { AlertsDemoServerSetupDeps } from '../server/types';
import { alertType as alwaysFiringAlert } from './alert_types/always_firing';
import { ALERTS_DEMO_APP_ID } from '../common/constants';
import { DEFAULT_APP_CATEGORIES } from '../../../src/core/utils/default_app_categories';

export class AlertsDemoPlugin implements Plugin<void, void, AlertsDemoServerSetupDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { alerting, features }: AlertsDemoServerSetupDeps) {
    this.logger.debug('alertsDemo: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    alerting.registerType(alwaysFiringAlert);
    features.registerKibanaFeature({
      id: ALERTS_DEMO_APP_ID,
      name: 'Alerts Demo examples',
      app: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      category: DEFAULT_APP_CATEGORIES.management,
      alerting: [alwaysFiringAlert.id],
      privileges: {
        all: {
          alerting: {
            rule: {
              all: [alwaysFiringAlert.id],
            },
            alert: {
              all: [alwaysFiringAlert.id],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
        read: {
          alerting: {
            rule: {
              read: [alwaysFiringAlert.id],
            },
            alert: {
              read: [alwaysFiringAlert.id],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
      },
    });
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('alertsDemo: Started');
    return {};
  }

  public stop() {}
}
