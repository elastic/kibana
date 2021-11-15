/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppMountParameters } from '../../../src/core/public';
import {
  AlertsDemoClientCoreStart,
  AlertsDemoClientCoreSetup,
  AlertsDemoPluginClass,
  AlertsDemoClientSetupDeps,
  AlertsDemoClientStartDeps,
} from './types';
import { ALERTS_DEMO_APP_ID } from '../common/constants';
import { PLUGIN_NAME } from '../common';
import { DEFAULT_APP_CATEGORIES } from '../../../src/core/public';
// import { getAlertType as getAlwaysFiringAlertType } from './alert_types/always_firing';
import { createAlwaysFiringAlertType } from './alert_types/always_firing';
export class AlertsDemoPlugin implements AlertsDemoPluginClass {
  constructor() {}

  public setup(core: AlertsDemoClientCoreSetup, pluginsSetup: AlertsDemoClientSetupDeps) {
    pluginsSetup.observability.navigation.registerSections(
      from(core.getStartServices()).pipe(
        map(
          ([
            {
              application: { capabilities },
            },
          ]) => [
            ...[
              {
                label: 'Demo',
                sortKey: 200,
                entries: [{ label: 'Alerts', app: 'alertsdemo', path: '/alerts-demo' }],
              },
            ],
          ]
        )
      )
    );
    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createAlwaysFiringAlertType()
    );

    // console.log(pluginsSetup.observability.observabilityRuleTypeRegistry.list(), '!!list');
    // pluginsSetup.triggersActionsUi.ruleTypeRegistry.register(getAlwaysFiringAlertType());
    pluginsSetup.developerExamples.register({
      appId: ALERTS_DEMO_APP_ID,
      title: 'Alerts Demo example',
      description: 'This alerting example walks you through how to set up a new rule.',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/plugins/rule_registry',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
    // Register an application into the side navigation menu
    core.application.register({
      id: ALERTS_DEMO_APP_ID,
      title: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.observability,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, pluginsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, pluginsStart, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('alertsDemo.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(_core: AlertsDemoClientCoreStart, _plugins: AlertsDemoClientStartDeps) {}

  public stop() {}
}
