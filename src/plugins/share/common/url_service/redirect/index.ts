/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SerializableRecord } from '@kbn/utility-types';

export { formatSearchParams } from './util/format_search_params';
export { parseSearchParams } from './util/parse_search_params';

export interface RedirectOptions {
  /** Locator ID. */
  id: string;

  /** Kibana version when locator params where generated. */
  version: string;

  /** Locator params. */
  params: unknown & SerializableRecord;
}
