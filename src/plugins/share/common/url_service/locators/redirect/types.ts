/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { FormatSearchParamsOptions } from './format_search_params';
import type {} from './space_url_parser';

/**
 * @public
 * Serializable locator parameters that can be used by the redirect service to navigate to a
 * location in Kibana.
 *
 * When passed to the public `share` plugin `.navigate()` function, locator params will also
 * be migrated.
 */
export interface RedirectOptions<P extends SerializableRecord = unknown & SerializableRecord> {
  /** Locator ID. */
  id: string;

  /** Kibana version when locator params were generated. */
  version: string;

  /** Locator params. */
  params: P;
}

export interface GetRedirectUrlOptions extends FormatSearchParamsOptions {
  /**
   * Optional space ID to use when generating the URL.
   * If not provided:
   * - on the client the current space ID will be used.
   * - on the server the URL will be generated without a space ID.
   */
  spaceId?: string;
}
