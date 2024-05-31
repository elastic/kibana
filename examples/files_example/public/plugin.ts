/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME, exampleFileKind, MyImageMetadata } from '../common';
import { FilesExamplePluginsStart, FilesExamplePluginsSetup } from './types';

export class FilesExamplePlugin
  implements Plugin<unknown, unknown, FilesExamplePluginsSetup, FilesExamplePluginsStart>
{
  public setup(
    core: CoreSetup<FilesExamplePluginsStart>,
    { files, developerExamples }: FilesExamplePluginsSetup
  ) {
    files.registerFileKind({
      id: exampleFileKind.id,
      allowedMimeTypes: exampleFileKind.allowedMimeTypes,
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description: 'Example plugin for the files plugin',
    });

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, deps] = await core.getStartServices();
        // Render the application
        return renderApp(
          coreStart,
          {
            files: {
              unscoped: deps.files.filesClientFactory.asUnscoped<MyImageMetadata>(),
              example: deps.files.filesClientFactory.asScoped<MyImageMetadata>(exampleFileKind.id),
            },
          },
          params
        );
      },
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
