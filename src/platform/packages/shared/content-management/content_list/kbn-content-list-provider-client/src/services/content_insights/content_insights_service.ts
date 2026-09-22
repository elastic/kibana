/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { Logger } from '@kbn/logging';
import {
  ContentInsightsClient,
  type ContentInsightsClientPublic,
} from '@kbn/content-management-content-insights-public';

/**
 * Options for {@link createContentInsightsService}.
 */
export interface ContentInsightsServiceOptions {
  /** Core HTTP service. */
  http: HttpStart;
  /** Logger used for warnings on tracking failures. */
  logger: Logger;
  /** Domain identifier (e.g. `'dashboard'`, `'visualization'`) used to scope insights. */
  domainId: string;
}

/**
 * Build a content-insights service for {@link SavedObjectActivityRow} from the
 * standard core services.
 *
 * Returns the upstream {@link ContentInsightsClient} typed as
 * {@link ContentInsightsClientPublic} so consumers can substitute their own
 * implementation if needed.
 *
 * The returned service is intended for use with `<SavedObjectActivityRow>` —
 * pass it as the component's `service` prop from `contentEditor.appendRows`.
 *
 * @example
 * ```ts
 * const insights = createContentInsightsService({
 *   http: coreServices.http,
 *   logger,
 *   domainId: 'dashboard',
 * });
 * ```
 */
export const createContentInsightsService = ({
  http,
  logger,
  domainId,
}: ContentInsightsServiceOptions): ContentInsightsClientPublic =>
  new ContentInsightsClient({ http, logger }, { domainId });
