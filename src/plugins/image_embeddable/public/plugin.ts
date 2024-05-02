/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableSetup, registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FilesSetup, FilesStart } from '@kbn/files-plugin/public';
import {
  ScreenshotModePluginSetup,
  ScreenshotModePluginStart,
} from '@kbn/screenshot-mode-plugin/public';
import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { imageClickTrigger } from './actions';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';
import { IMAGE_EMBEDDABLE_TYPE } from './image_embeddable/constants';
import { registerCreateImageAction } from './actions/create_image_action';

export interface ImageEmbeddableSetupDependencies {
  embeddable: EmbeddableSetup;
  files: FilesSetup;
  security?: SecurityPluginSetup;
  uiActions: UiActionsSetup;
  screenshotMode?: ScreenshotModePluginSetup;
}

export interface ImageEmbeddableStartDependencies {
  files: FilesStart;
  security?: SecurityPluginStart;
  uiActions: UiActionsStart;
  screenshotMode?: ScreenshotModePluginStart;
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartContract {}

export class ImageEmbeddablePlugin
  implements
    Plugin<
      SetupContract,
      StartContract,
      ImageEmbeddableSetupDependencies,
      ImageEmbeddableStartDependencies
    >
{
  constructor() {}

  public setup(
    core: CoreSetup<ImageEmbeddableStartDependencies>,
    plugins: ImageEmbeddableSetupDependencies
  ): SetupContract {
    plugins.uiActions.registerTrigger(imageClickTrigger);
    return {};
  }

  public start(core: CoreStart, plugins: ImageEmbeddableStartDependencies): StartContract {
    setKibanaServices(core, plugins);

    untilPluginStartServicesReady().then(() => {
      registerCreateImageAction();
    });
    registerReactEmbeddableFactory(IMAGE_EMBEDDABLE_TYPE, async () => {
      const [_, { getImageEmbeddableFactory }] = await Promise.all([
        untilPluginStartServicesReady(),
        import('./image_embeddable/get_image_embeddable_factory'),
      ]);
      return getImageEmbeddableFactory({ embeddableEnhanced: plugins.embeddableEnhanced });
    });

    return {};
  }

  public stop() {}
}
