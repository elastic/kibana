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
import { AlertsDemoServerSetupDeps, BackendLibs } from '../server/types';
import {
  alertType as alwaysFiringAlert,
  registerAlwaysFiringRuleType,
} from './rule_types/always_firing';
import { RAC_EXAMPLE_APP_ID } from '../common/constants';
import { DEFAULT_APP_CATEGORIES } from '../../../src/core/utils/default_app_categories';
import { RulesService } from './services';

export class AlertsDemoPlugin implements Plugin<void, void, AlertsDemoServerSetupDeps> {
  public libs: BackendLibs | undefined;
  private readonly logger: Logger;
  private rules: RulesService;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.rules = new RulesService(RAC_EXAMPLE_APP_ID, 'observability.rac_example', this.logger);
  }

  public setup(core: CoreSetup, { alerting, features, ruleRegistry }: AlertsDemoServerSetupDeps) {
    this.logger.debug('alertsDemo: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);
    this.libs = {
      rules: this.rules.setup(core, { alerting, ruleRegistry }),
    };
    registerAlwaysFiringRuleType(alerting, this.libs);
    // alerting.registerType(alwaysFiringAlertType);
    features.registerKibanaFeature({
      id: RAC_EXAMPLE_APP_ID,
      name: 'RAC example',
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
