/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { FilesSetup, FilesStart } from '@kbn/files-plugin/public';
import {
  ScreenshotModePluginSetup,
  ScreenshotModePluginStart,
} from '@kbn/screenshot-mode-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { imageClickTrigger } from './actions';
import { registerCreateImageAction } from './actions/create_image_action';
import { registerImageEmbeddableFactory } from './image_embeddable/register_image_embeddable_factory';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  files: FilesSetup;
  security?: SecurityPluginSetup;
  uiActions: UiActionsSetup;
  screenshotMode?: ScreenshotModePluginSetup;
}

export interface StartDependencies {
  files: FilesStart;
  security?: SecurityPluginStart;
  uiActions: UiActionsStart;
  screenshotMode?: ScreenshotModePluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartContract {}

export class ImageEmbeddablePlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    plugins.uiActions.registerTrigger(imageClickTrigger);
    return {};
  }

  public start(
    core: CoreStart,
    { files, security, uiActions, screenshotMode }: StartDependencies
  ): StartContract {
    registerCreateImageAction({ core, files, security, uiActions });
    registerImageEmbeddableFactory({ core, files, security, uiActions, screenshotMode });
    return {};
  }

  public stop() {}
}
