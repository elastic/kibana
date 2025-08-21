/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { TaggingCorePluginStart } from './types';
import type { ITagsClient, Tag, TagAttributes, GetAllTagsOptions, CreateTagOptions, TaggedObject } from '../common';

export class TaggingCorePlugin implements Plugin<{}, TaggingCorePluginStart> {
  private contentManagementService?: ContentManagementPublicStart;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): {} {
    return {};
  }

  public start(core: CoreStart): TaggingCorePluginStart {
    // Create a closure to capture the content management service
    const getContentManagementService = () => this.contentManagementService;
    // Create a simple tags client that uses the saved objects API
    const tagsClient: ITagsClient = {
      async create(attributes: TagAttributes, options?: CreateTagOptions): Promise<Tag> {
        const response = await core.http.post('/api/saved_objects_tagging/tags/create', {
          body: JSON.stringify(attributes),
        });
        return response.tag;
      },

      async get(id: string): Promise<Tag> {
        const response = await core.http.get(`/api/saved_objects_tagging/tags/${id}`);
        return response.tag;
      },

      async getAll(options?: GetAllTagsOptions): Promise<Tag[]> {
        const response = await core.http.get('/api/saved_objects_tagging/tags');
        return response.tags;
      },

      async findByName(name: string, options?: { exact?: boolean }): Promise<Tag | null> {
        const response = await core.http.get('/api/saved_objects_tagging/tags', {
          query: { name, exact: options?.exact || false },
        });
        return response.tags.length > 0 ? response.tags[0] : null;
      },

      async delete(id: string): Promise<void> {
        await core.http.delete(`/api/saved_objects_tagging/tags/${id}`);
      },

      async update(id: string, attributes: TagAttributes): Promise<Tag> {
        const response = await core.http.put(`/api/saved_objects_tagging/tags/${id}`, {
          body: JSON.stringify(attributes),
        });
        return response.tag;
      },

      async findObjectsByTags(tagIds: string[], limit: number = 10): Promise<TaggedObject[]> {
        if (tagIds.length === 0) {
          return [];
        }

        try {
          
          // Use the content management service to find objects with the specified tags
          const contentManagementService = getContentManagementService();
          if (!contentManagementService) {
            console.log('Content management service not available');
            return [];
          }

          const taggedObjects: TaggedObject[] = [];

          // Search for dashboards with the specified tags
          try {
            const dashboardResponse = await contentManagementService.client.search({
              contentTypeId: 'dashboard',
              query: {
                limit,
                tags: {
                  included: tagIds,
                },
              },
            });

            for (const hit of dashboardResponse.hits) {
              taggedObjects.push({
                id: hit.id,
                title: hit.attributes.title || hit.id,
                type: 'dashboard',
                link: `/app/dashboards#/view/${hit.id}`,
                tags: hit.references?.filter(ref => ref.type === 'tag').map(ref => ref.id) || [],
              });
            }
          } catch (error) {
            console.log('Failed to search dashboards:', error);
          }

          // Search for saved searches with the specified tags
          try {
            const searchResponse = await contentManagementService.client.search({
              contentTypeId: 'search',
              query: {
                limit,
                tags: {
                  included: tagIds,
                },
              },
            });

            for (const hit of searchResponse.hits) {
              taggedObjects.push({
                id: hit.id,
                title: hit.attributes.title || hit.id,
                type: 'discover',
                link: `/app/discover#/view/${hit.id}`,
                tags: hit.references?.filter(ref => ref.type === 'tag').map(ref => ref.id) || [],
              });
            }
          } catch (error) {
            console.log('Failed to search saved searches:', error);
          }

          return taggedObjects.slice(0, limit);
        } catch (error) {
          console.log('Failed to find objects by tags:', error);
          return [];
        }
      },
    };

    return {
      client: tagsClient,
      setContentManagementService: (contentManagement: ContentManagementPublicStart) => {
        this.contentManagementService = contentManagement;
      },
      isContentManagementReady: () => {
        return !!this.contentManagementService;
      },
    };
  }

  public stop() {}
}
