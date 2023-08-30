/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MSearchQuery } from '@kbn/content-management-plugin/common';
import { SOWithMetadata } from '@kbn/content-management-utils';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  VisualizeListClientPluginSetup,
  VisualizeListClientPluginStart,
  VisualizeListClientDeps,
  VisualizationClient,
  MSearchOptions,
} from './types';

export class VisualizeListClientPlugin
  implements Plugin<VisualizeListClientPluginSetup, VisualizeListClientPluginStart>
{
  public setup(core: CoreSetup) {
    return {};
  }

  public start(
    core: CoreStart,
    { contentManagement }: VisualizeListClientDeps
  ): VisualizeListClientPluginStart {
    const clients = new Map<string, unknown>();
    return {
      registerType: (contentId, contentCRUD) => {
        clients.set(contentId, contentCRUD);
      },
      getClientType: <
        ContentType extends string,
        Attr extends object,
        SearchOptions extends object = object
      >(
        contentId: string
      ) => {
        const client = clients.get(contentId);
        return client as VisualizationClient<ContentType, Attr, SearchOptions>;
      },
      mSearch: async <Attr extends object, SearchOptions extends object = object>(
        query: MSearchQuery,
        options?: MSearchOptions
      ) => {
        const contentTypes = Array.from(clients.keys()).map((contentTypeId) => ({ contentTypeId }));
        const res = await contentManagement.client.mSearch<SOWithMetadata<Attr>>({
          contentTypes,
          query,
          options,
        });
        return res;
      },
    };
  }

  public stop() {}
}
