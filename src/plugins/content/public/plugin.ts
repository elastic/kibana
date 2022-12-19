/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { ContentPluginSetup, ContentPluginStart } from './types';
// import { ContentService } from './service/content_service';


export class ContentPlugin implements Plugin<ContentPluginSetup, ContentPluginStart> {
  // private readonly content = new ContentService();

  public setup(core: CoreSetup): ContentPluginSetup {
    // content.registry.register({
    //   id: 'dashboard',
    //   name: i18n.translate('content.dashboard.name', {
    //     defaultMessage: 'Dashboard',
    //   }),
    //   description: i18n.translate('content.dashboard.description', {
    //     defaultMessage: 'Dashboard',
    //   }),
    //   icon: 'dashboardApp',
    //   operations: {
    //     read: async (id: string) => {
    //       const [coreStart] = await core.getStartServices();
    //       const so = coreStart.savedObjects.client;
    //       const res = await so.get('dashboard', id);
    //       const details: ContentItemDetails = {
    //         id: res.id,
    //         fields: {
    //           title: res.attributes.title,
    //           description: res.attributes.description,
    //         },
    //         data: res.attributes,
    //       };
    //       return details;
    //     },
    //     list: async () => {
    //       const [coreStart] = await core.getStartServices();
    //       const soc = coreStart.savedObjects.client;
    //       const res = await soc.find({
    //         type: 'dashboard',
    //       });
    //       const details: ContentItemDetails[] = res.savedObjects.map((so) => ({
    //         id: so.id,
    //         fields: {
    //           title: so.attributes.title,
    //           description: so.attributes.description,
    //         },
    //         data: so.attributes,
    //       }));
    //       return details;
    //     },
    //   },
    // });

    return {};
  }

  public start(core: CoreStart): ContentPluginStart {
    return {};
  }

  public stop() {}
}
