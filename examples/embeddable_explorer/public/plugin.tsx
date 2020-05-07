/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { EmbeddableExamplesStart } from 'examples/embeddable_examples/public/plugin';
import { UiActionsService } from '../../../src/plugins/ui_actions/public';
import { EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';

interface StartDeps {
  uiActions: UiActionsService;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  embeddableExamples: EmbeddableExamplesStart;
}

export class EmbeddableExplorerPlugin implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<StartDeps>) {
    core.application.register({
      id: 'embeddableExplorer',
      title: 'Embeddable explorer',
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        await depsStart.embeddableExamples.createSampleData();
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
          },
          params.element
        );
      },
    });
  }

  public start() {}
  public stop() {}
}
