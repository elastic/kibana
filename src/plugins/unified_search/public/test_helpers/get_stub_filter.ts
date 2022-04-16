/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterStateStore } from '@kbn/data-plugin/public';

export function getFilter(
  store: FilterStateStore,
  disabled: boolean,
  negated: boolean,
  queryKey: string,
  queryValue: any
): Filter {
  return {
    $state: {
      store,
    },
    meta: {
      index: 'logstash-*',
      disabled,
      negate: negated,
      alias: null,
    },
    query: {
      match: {
        [queryKey]: queryValue,
      },
    },
  };
}
