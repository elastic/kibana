/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import image from './resizable_layout_examples.png';

export interface ResizableLayoutExamplesSetupPlugins {
  developerExamples: DeveloperExamplesSetup;
}

const PLUGIN_ID = 'resizableLayoutExamples';
const PLUGIN_NAME = 'Resizable Layout Examples';

export class ResizableLayoutExamplesPlugin implements Plugin {
  setup(core: CoreSetup, plugins: ResizableLayoutExamplesSetupPlugins) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Render the application
        return renderApp(params);
      },
    });

    plugins.developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description:
        'A component for creating resizable layouts containing a fixed width panel and a flexible panel, with support for horizontal and vertical layouts.',
      image,
    });
  }

  start() {}
}
