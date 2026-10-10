/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_SORT_FIELD_NAMES, type AsCodeSortFieldName } from '@kbn/as-code-shared-schemas';

const SORT_FIELD_TO_SAVED_OBJECT = {
  'meta.updated_at': 'updated_at',
  'meta.created_at': 'created_at',
} as const satisfies Record<AsCodeSortFieldName, 'updated_at' | 'created_at'>;

const isSortFieldName = (value: string): value is AsCodeSortFieldName =>
  (AS_CODE_SORT_FIELD_NAMES as readonly string[]).includes(value);

export interface AsCodeListFindSort {
  sortField?: 'updated_at' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

/** Maps an As Code list `sort` query onto a single saved object find sort. */
export const getAsCodeListSort = ({
  query,
  sort,
}: {
  query?: string;
  sort?: string;
}): AsCodeListFindSort => {
  const requested = sort?.trim();
  if (requested) {
    const descending = requested.startsWith('-');
    const name = descending ? requested.slice(1) : requested;
    if (!isSortFieldName(name)) {
      throw new Error(
        `sort must be ${AS_CODE_SORT_FIELD_NAMES.join(
          ' or '
        )}. Prefix it with - for descending order.`
      );
    }

    return {
      sortField: SORT_FIELD_TO_SAVED_OBJECT[name],
      sortOrder: descending ? 'desc' : 'asc',
    };
  }

  if (!query) {
    return { sortField: 'updated_at', sortOrder: 'desc' };
  }

  return {};
};
