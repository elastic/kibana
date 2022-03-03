/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableExamplesStart } from 'examples/embeddable_examples/public/plugin';
import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { UiActionsService } from '../../../src/plugins/ui_actions/public';
import { EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import img from './embeddables.png';

interface StartDeps {
  uiActions: UiActionsService;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  embeddableExamples: EmbeddableExamplesStart;
}

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class EmbeddableExplorerPlugin implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'embeddableExplorer',
      title: 'Embeddable explorer',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        try {
          await depsStart.embeddableExamples.createSampleData();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to create sample data', error);
        }
        return renderApp(
          {
            notifications: coreStart.notifications,
            inspector: depsStart.inspector,
            embeddableApi: depsStart.embeddable,
            uiActionsApi: depsStart.uiActions,
            basename: params.appBasePath,
            uiSettingsClient: coreStart.uiSettings,
            savedObject: coreStart.savedObjects,
            overlays: coreStart.overlays,
            navigateToApp: coreStart.application.navigateToApp,
            embeddableExamples: depsStart.embeddableExamples,
          },
          params.element
        );
      },
    });

    developerExamples.register({
      appId: 'embeddableExplorer',
      title: 'Embeddables',
      description: `Multiple embeddable examples showcase how to build custom dashboard widgets, how to build your own custom "container"
      (like a dashboard but imagine you want to render the panels differently), and how to embed anything that can show up in a dashboard
      in your own UI and app, that comes pre-connected with actions built by other developers.
      `,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/src/plugins/embeddable/README.asciidoc',
          iconType: 'logoGithub',
          target: '_blank',
          size: 's',
        },
      ],
      image: img,
    });
  }

  public start() {}
  public stop() {}
}
