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
   * `true` only when a cross-project read is both possible and meaningful for this request, i.e.
   * at least one linked project is visible to the principal. Unresolved resolves to `false`, so a
   * principal that cannot list linked projects reads origin-only rather than failing.
   */
  isCpsActive(request: KibanaRequest): Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CPSServerStop {}
