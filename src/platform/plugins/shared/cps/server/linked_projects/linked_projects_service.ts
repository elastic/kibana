/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import type { CpsLinkedProject, ProjectTagsResponse } from '@kbn/cps-utils';

export class LinkedProjectsService {
  // A WeakMap keyed on the request object is used deliberately: the answer is principal-scoped, so
  // it must never be shared across requests, and the entry dies with the request.
  private readonly cache = new WeakMap<KibanaRequest, Promise<CpsLinkedProject[] | undefined>>();

  constructor(
    private readonly logger: Logger,
    private readonly elasticsearch: ElasticsearchServiceStart
  ) {}

  public getLinkedProjects(request: KibanaRequest): Promise<CpsLinkedProject[] | undefined> {
    const cached = this.cache.get(request);
    if (cached) {
      return cached;
    }

    const pending = this.fetchLinkedProjects(request);
    this.cache.set(request, pending);
    return pending;
  }

  /**
   * Unresolved deliberately means "not active" because a principal that cannot list linked projects
   * cannot search them either, so origin-only is the correct read for it.
   */
  public async isCpsActive(request: KibanaRequest): Promise<boolean> {
    return (await this.getLinkedProjects(request))?.length ? true : false;
  }

  private async fetchLinkedProjects(
    request: KibanaRequest
  ): Promise<CpsLinkedProject[] | undefined> {
    try {
      // `PROJECT_ROUTING_ALL` is sent explicitly rather than omitting the field, so this asks
      // exactly the question the project picker asks (`CPSManager` fetches its project count with
      // the same `_alias:*` expression) instead of relying on Elasticsearch's default for a missing
      // `project_routing`, which would scope the answer to the space rather than to every project.
      const response = await this.elasticsearch.client
        .asScoped(request)
        .asCurrentUser.transport.request<ProjectTagsResponse>({
          method: 'POST',
          path: '/_project/tags',
          body: { project_routing: PROJECT_ROUTING_ALL },
        });

      return response.linked_projects
        ? Object.values(response.linked_projects).map(({ _id, _alias, _type, _organisation }) => ({
            id: _id,
            alias: _alias,
            type: _type,
            organization: _organisation,
          }))
        : [];
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 401 || statusCode === 403) {
        // The request principal cannot list linked projects. This typically means they lack the
        // `read_project_routing` cluster privilege, so they cannot search linked projects either.
        // Leave linked projects unresolved rather than misreporting an empty scope.
        this.logger.debug(
          `The request principal is not authorized to resolve linked projects via /_project/tags (status ${statusCode}); the principal lacks the read_project_routing cluster privilege so cross-project reads are not available to it.`
        );
      } else {
        this.logger.warn(
          `Failed to resolve linked projects via /_project/tags: ${
            error instanceof Error ? error.message : String(error)
          }. Recording linked projects as unresolved.`
        );
      }
      return undefined;
    }
  }
}
