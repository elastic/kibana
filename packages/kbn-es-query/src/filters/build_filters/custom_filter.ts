/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { Filter, FILTERS, FilterStateStore } from './types';

/** @public */
export type CustomFilter = Filter & {
  [key: string]: SerializableRecord;
};

/**
 *
 * @param indexPatternString
 * @param queryDsl
 * @param disabled
 * @param negate
 * @param alias
 * @param store
 * @returns
 *
 * @public
 */
export function buildCustomFilter(
  indexPatternString: string,
  queryDsl: SerializableRecord,
  disabled?: boolean,
  negate?: boolean,
  alias?: string | null,
  store?: FilterStateStore
): Filter {
  const filter: CustomFilter = {
    ...queryDsl,
    meta: {
      index: indexPatternString,
      type: FILTERS.CUSTOM,
      disabled,
      negate,
      alias,
    },
  };
  filter.$state = { store: store ?? FilterStateStore.APP_STATE };
  return filter;
}
