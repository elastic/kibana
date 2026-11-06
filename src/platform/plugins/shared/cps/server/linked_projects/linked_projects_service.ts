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
   * `undefined` when the linked projects could not be resolved. It is not collapsed to `false`
   * here: whether an unresolved scope should read origin-only or fan out and let Elasticsearch
   * scope the result is a consumer policy, and this service does not have the standing to pick one
   * for every consumer.
   */
  public async isCpsActive(request: KibanaRequest): Promise<boolean | undefined> {
    const linkedProjects = await this.getLinkedProjects(request);
    return linkedProjects === undefined ? undefined : linkedProjects.length > 0;
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
      // Both rejections below are expected in normal operation and are re-evaluated on every
      // request, so they are logged at `debug`: at `warn` they would repeat on each read for as
      // long as the principal keeps making them. Either way the scope stays unresolved rather than
      // being misreported as empty.
      if (statusCode === 403) {
        // The principal lacks the `read_project_routing` cluster privilege. That does not mean it
        // cannot search linked projects — Elasticsearch scopes cross-project results by index
        // authorization, not by this privilege — so this is reported as unresolved rather than as
        // "no linked projects". What to do about an unresolved scope is left to the consumer.
        this.logger.debug(
          `The request principal is not authorized to resolve linked projects via /_project/tags (status 403); it lacks the read_project_routing cluster privilege.`
        );
      } else if (statusCode === 401) {
        // Not a Kibana authentication failure - those are rejected by the HTTP layer long before a
        // route handler runs. Elasticsearch refused the credential Kibana forwarded on
        // `asCurrentUser`, which is what happens when the request carries no cross-project-capable
        // cloud identity.
        this.logger.debug(
          `Elasticsearch rejected the credential forwarded while resolving linked projects via /_project/tags (status 401); the request principal has no cross-project-capable cloud identity.`
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
