/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CpsLinkedProject } from '@kbn/cps-utils';
import type { INpreClient } from './npre';

export interface CPSServerSetup {
  getCpsEnabled(): boolean;
  /** Resolves to true when the current pricing tier is eligible for cross-project search. */
  isTierEligible(): Promise<boolean>;
}

export interface CPSServerStart {
  createNpreClient(request: KibanaRequest): INpreClient;
  /**
   * The linked projects visible to the request principal, or `undefined` when they could not be
   * resolved (the principal is not authorized to list them, or the call failed). `undefined` is
   * deliberately distinct from `[]`: "unknown" must never be read as "none".
   */
  getLinkedProjects(request: KibanaRequest): Promise<CpsLinkedProject[] | undefined>;
  /**
   * `true` when at least one linked project is visible to the request principal, `false` when none
   * are, and `undefined` when that could not be determined — most often because the principal
   * lacks the `read_project_routing` cluster privilege.
   *
   * `undefined` is not a synonym for `false`. A principal without `read_project_routing` may still
   * be authorized to search linked projects, since Elasticsearch scopes cross-project results by
   * index authorization rather than by that privilege. Deciding whether an unresolved scope should
   * read origin-only or fan out and let Elasticsearch scope the result is the consumer's call, so
   * it is left to the consumer. Note that a plain truthiness check reads `undefined` as "do not
   * fan out"; use `=== false` if you want to fan out on unresolved.
   */
  isCpsActive(request: KibanaRequest): Promise<boolean | undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CPSServerStop {}
