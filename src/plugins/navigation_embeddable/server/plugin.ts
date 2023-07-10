/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { CONTENT_ID, LATEST_VERSION } from '../common';
import { NavigationEmbeddableStorage } from './content_management';

export class NavigationEmbeddableServerPlugin implements Plugin<object, object> {
  public setup(
    core: CoreSetup,
    plugins: {
      contentManagement: ContentManagementServerSetup;
    }
  ) {
    plugins.contentManagement.register({
      id: CONTENT_ID,
      storage: new NavigationEmbeddableStorage(),
      version: {
        latest: LATEST_VERSION,
      },
    });

    core.savedObjects.registerType({
      name: CONTENT_ID,
      hidden: false,
      hiddenFromHttpApis: true,
      namespaceType: 'multiple',
      mappings: {
        dynamic: false,
        properties: {
          title: { type: 'text' },
          description: { type: 'text' },
          linksJSON: { type: 'text' },
        },
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
