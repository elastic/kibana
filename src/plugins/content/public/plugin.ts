/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ContentPluginSetup, ContentPluginStart } from './types';
import { ContentService } from './service/content_service';
import { i18n } from '@kbn/i18n';
import {ContentItemDetails} from '@kbn/content-management-state';

export class ContentPlugin implements Plugin<ContentPluginSetup, ContentPluginStart> {
  private content?: ContentService;

  public setup(core: CoreSetup): ContentPluginSetup {
    this.content = new ContentService();

    this.content.registry.register({
      id: 'dashboard',
      name: i18n.translate('content.dashboard.name', {
        defaultMessage: 'Dashboard',
      }),
      description: i18n.translate('content.dashboard.description', {
        defaultMessage: 'Dashboard',
      }),
      icon: 'dashboardApp',
      operations: {
        read: async (id: string) => {
          const [coreStart] = await core.getStartServices();
          const so = coreStart.savedObjects.client;
          const res = await so.get('dashboard', id);
          const attributes = res.attributes as { title: string; description: string };
          const details: ContentItemDetails = {
            id: res.id,
            fields: {
              title: attributes.title,
              description: attributes.description,
            },
            content: attributes,
          };
          return details;
        },
      },
    });

    return {
      content: this.content.setup(),
    };
  }

  public start(core: CoreStart): ContentPluginStart {
    return {
      content: this.content!.start(),
    };
  }

  public stop() {
    this.content!.stop();
  }
}
