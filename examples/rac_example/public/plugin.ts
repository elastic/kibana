/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppMountParameters } from '../../../src/core/public';
import {
  RacExampleClientCoreStart,
  RacExampleClientCoreSetup,
  RacExamplePluginClass,
  RacExampleClientSetupDeps,
  RacExampleClientStartDeps,
} from './types';
import { RAC_EXAMPLE_APP_ID } from '../common/constants';
import { PLUGIN_NAME } from '../common';
import { DEFAULT_APP_CATEGORIES } from '../../../src/core/public';
import { createAlwaysFiringAlertType } from './alert_types/always_firing';
import image from './alerts_table.png';

export class RacExamplePlugin implements RacExamplePluginClass {
  constructor() {}

  public setup(core: RacExampleClientCoreSetup, pluginsSetup: RacExampleClientSetupDeps) {
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
      appId: `${RAC_EXAMPLE_APP_ID}/createRule`,
      title: 'RAC example',
      description:
        'This example walks you through how to RAC register an Observability rule type, so that generated alerts get saved in the alerts-as-data indices and show up in the Alerts Observability table. Similar steps could be followed to RAC register rule types of other solutions as well.',
      image,
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
      id: RAC_EXAMPLE_APP_ID,
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
  }

  public start(_core: RacExampleClientCoreStart, _plugins: RacExampleClientStartDeps) {}

  public stop() {}
}
