/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type ElasticSearchHit<T = unknown> = estypes.SearchHit<T>;

export type HitsFlattened = Array<Record<string, unknown>>;

export type ValueToStringConverter = (
  rowIndex: number,
  columnId: string,
  options?: { disableMultiline?: boolean }
) => { formattedString: string; withFormula: boolean };
