/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@kbn/es-query';
import type { LensApiFilterType } from '../../schema/filter';

export function fromFilterAPIToLensState(filter: LensApiFilterType | undefined): Query | undefined {
  if (!filter) {
    return;
  }

  return {
    language: filter.language,
    query: filter.query,
  };
}

export function fromFilterLensStateToAPI({
  query,
  language,
}: Query): LensApiFilterType | undefined {
  if (typeof query !== 'string') {
    return;
  }
  if (language !== 'kuery' && language !== 'lucene') {
    return;
  }
  return { query, language };
}

export const DEFAULT_FILTER = {
  query: '*',
  language: 'kuery',
} satisfies LensApiFilterType;
