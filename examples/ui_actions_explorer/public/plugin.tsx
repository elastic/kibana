/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import {
  PHONE_TRIGGER,
  USER_TRIGGER,
  COUNTRY_TRIGGER,
  lookUpWeatherAction,
  viewInMapsAction,
  createEditUserAction,
  makePhoneCallAction,
  showcasePluggability,
  createTriggerPhoneTriggerAction,
} from './actions/actions';
import image from './ui_actions.png';

interface StartDeps {
  uiActions: UiActionsStart;
}

interface SetupDeps {
  uiActions: UiActionsSetup;
  developerExamples: DeveloperExamplesSetup;
}

export class UiActionsExplorerPlugin implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    deps.uiActions.registerTrigger({
      id: COUNTRY_TRIGGER,
    });
    deps.uiActions.registerTrigger({
      id: PHONE_TRIGGER,
    });
    deps.uiActions.registerTrigger({
      id: USER_TRIGGER,
    });

    const startServices = core.getStartServices();

    deps.uiActions.addTriggerActionAsync(USER_TRIGGER, 'TRIGGER_PHONE_TRIGGER_ACTION', async () =>
      createTriggerPhoneTriggerAction(async () => (await startServices)[1].uiActions)
    );
    deps.uiActions.addTriggerActionAsync(USER_TRIGGER, 'EDIT_USER_ACTION', async () =>
      createEditUserAction(async () => (await startServices)[0])
    );

    deps.uiActions.addTriggerActionAsync(
      COUNTRY_TRIGGER,
      'VIEW_IN_MAPS_ACTION',
      async () => viewInMapsAction
    );
    deps.uiActions.addTriggerActionAsync(
      COUNTRY_TRIGGER,
      'LOOK_UP_WEATHER_ACTION',
      async () => lookUpWeatherAction
    );
    deps.uiActions.addTriggerActionAsync(
      COUNTRY_TRIGGER,
      'SHOWCASE_PLUGGABILITY_ACTION_COUNTRY',
      async () => showcasePluggability
    );
    deps.uiActions.addTriggerActionAsync(
      PHONE_TRIGGER,
      'MAKE_PHONE_CALL_ACTION',
      async () => makePhoneCallAction
    );
    deps.uiActions.addTriggerActionAsync(
      PHONE_TRIGGER,
      'SHOWCASE_PLUGGABILITY_ACTION_PHONE',
      async () => showcasePluggability
    );
    deps.uiActions.addTriggerActionAsync(
      USER_TRIGGER,
      'SHOWCASE_PLUGGABILITY_ACTION_USER',
      async () => showcasePluggability
    );

    core.application.register({
      id: 'uiActionsExplorer',
      title: 'Ui Actions Explorer',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp({ uiActionsStartService: depsStart.uiActions, core: coreStart }, params);
      },
    });

    deps.developerExamples.register({
      appId: 'uiActionsExplorer',
      title: 'Actions & Triggers',
      description: `Learn how to extent Kibana's UI event system with actions and triggers. In the screen shot, plugins extend dashboard panels by attaching new actions to PANEL_BADGE_TRIGGER and CONTEXT_MENU_TRIGGER triggers.`,
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/ui_actions/README.asciidoc',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
