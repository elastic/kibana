/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { FilesSetup, FilesStart } from '@kbn/files-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { IMAGE_EMBEDDABLE_TYPE, ImageEmbeddableFactoryDefinition } from './image_embeddable';
import { imageClickTrigger } from './actions';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  files: FilesSetup;
  security?: SecurityPluginSetup;
  uiActions: UiActionsSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  files: FilesStart;
  security?: SecurityPluginStart;
  uiActions: UiActionsStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartContract {}

export class ImageEmbeddablePlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    const start = createStartServicesGetter(core.getStartServices);
    plugins.embeddable.registerEmbeddableFactory(
      IMAGE_EMBEDDABLE_TYPE,
      new ImageEmbeddableFactoryDefinition({
        start: () => ({
          application: start().core.application,
          overlays: start().core.overlays,
          files: start().plugins.files.filesClientFactory.asUnscoped(),
          externalUrl: start().core.http.externalUrl,
          theme: start().core.theme,
          getUser: async () => {
            const security = start().plugins.security;
            return security ? await security.authc.getCurrentUser() : undefined;
          },
          uiActions: start().plugins.uiActions,
        }),
      })
    );

    plugins.uiActions.registerTrigger(imageClickTrigger);
    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
