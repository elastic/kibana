/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isString } from 'lodash';
import { DslQuery } from './es_query_dsl';

export function luceneStringToDsl(query: string | any): DslQuery {
  if (isString(query)) {
    if (query.trim() === '') {
      return { match_all: {} };
    }

    return { query_string: { query } };
  }

  return query;
}
