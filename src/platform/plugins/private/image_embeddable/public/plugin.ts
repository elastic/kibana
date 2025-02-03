/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { FilesSetup, FilesStart } from '@kbn/files-plugin/public';
import {
  ScreenshotModePluginSetup,
  ScreenshotModePluginStart,
} from '@kbn/screenshot-mode-plugin/public';
import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { ADD_PANEL_TRIGGER, UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { imageClickTrigger } from './ui_actions/image_click_trigger';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from './image_embeddable/constants';

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
  embeddable: EmbeddableStart;
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

    plugins.embeddable.registerReactEmbeddableFactory(IMAGE_EMBEDDABLE_TYPE, async () => {
      const [_, { getImageEmbeddableFactory }, [__, { embeddableEnhanced }]] = await Promise.all([
        untilPluginStartServicesReady(),
        import('./image_embeddable/get_image_embeddable_factory'),
        core.getStartServices(),
      ]);
      return getImageEmbeddableFactory({ embeddableEnhanced });
    });
    return {};
  }

  public start(core: CoreStart, plugins: ImageEmbeddableStartDependencies): StartContract {
    setKibanaServices(core, plugins);

    plugins.uiActions.registerActionAsync(ADD_IMAGE_EMBEDDABLE_ACTION_ID, async () => {
      const { addImageAction } = await import('./ui_actions/add_image_action');
      return addImageAction;
    });
    plugins.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_IMAGE_EMBEDDABLE_ACTION_ID);
    if (plugins.uiActions.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
      // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
      // the create action if the Canvas-specific trigger does indeed exist.
      plugins.uiActions.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', ADD_IMAGE_EMBEDDABLE_ACTION_ID);
    }

    return {};
  }

  public stop() {}
}
