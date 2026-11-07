/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchStart } from '../../search';
import { loadEsqlQueryProfile } from './load_esql_query_profile';
import { buildQueryProfileHeat } from './query_heat_model';
import type { QueryProfileHeat } from './query_heat_model';

/** Re-runs a logged ES|QL request with profiling and returns where its query spent its time. */
export async function loadQueryProfileHeat({
  search,
  requestJson,
  abortSignal,
}: {
  search: Pick<ISearchStart, 'esql'>;
  requestJson: { query?: unknown };
  abortSignal: AbortSignal;
}): Promise<QueryProfileHeat | undefined> {
  const view = await loadEsqlQueryProfile({ search, requestJson, abortSignal });
  return typeof requestJson.query === 'string'
    ? buildQueryProfileHeat(view, requestJson.query)
    : undefined;
}
