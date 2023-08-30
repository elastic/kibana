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
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  VisualizeListClientPluginSetup,
  VisualizeListClientPluginStart,
  VisualizeListClientDeps,
  VisualizationClient,
  MSearchOptions,
  SerializableAttributes,
} from './types';

export class VisualizeListClientPlugin
  implements Plugin<VisualizeListClientPluginSetup, VisualizeListClientPluginStart>
{
  private clients = new Map<string, (contentManagement: ContentManagementPublicStart) => unknown>();

  public setup(core: CoreSetup): VisualizeListClientPluginSetup {
    return {
      registerType: (contentId, contentCRUDFactory) => {
        this.clients.set(contentId, contentCRUDFactory);
      },
    };
  }

  public start(
    core: CoreStart,
    { contentManagement }: VisualizeListClientDeps
  ): VisualizeListClientPluginStart {
    return {
      getClientType: <
        ContentType extends string,
        Attr extends SerializableAttributes,
        SearchOptions extends object = object
      >(
        contentId: string
      ) => {
        const clientFactory = this.clients.get(contentId) as (
          contentManagement: ContentManagementPublicStart
        ) => VisualizationClient<ContentType, Attr, SearchOptions>;
        return clientFactory(contentManagement);
      },
      mSearch: async <Attr extends SerializableAttributes, SearchOptions extends object = object>(
        query: MSearchQuery,
        options?: MSearchOptions
      ) => {
        const contentTypes = Array.from(this.clients.keys()).map((contentTypeId) => ({
          contentTypeId,
        }));
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
