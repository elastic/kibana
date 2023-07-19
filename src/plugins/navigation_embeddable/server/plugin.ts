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
import { navigationEmbeddableSavedObjectType } from './saved_objects';
import { NavigationEmbeddableAttributes } from '../common/content_management';

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

    core.savedObjects.registerType<NavigationEmbeddableAttributes>(
      navigationEmbeddableSavedObjectType
    );

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
