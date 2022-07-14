/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AggregateQuery,
  Query,
  isOfAggregateQueryType,
  getAggregateQueryMode,
} from '@kbn/es-query';
import { RecordRawType } from '../hooks/use_saved_search';

export function getRawRecordType(query?: Query | AggregateQuery) {
  if (query && isOfAggregateQueryType(query) && getAggregateQueryMode(query) === 'sql') {
    return RecordRawType.PLAIN;
  }

  return RecordRawType.DOCUMENT;
}

export function isPlainRecord(query?: Query | AggregateQuery): query is AggregateQuery {
  return getRawRecordType(query) === RecordRawType.PLAIN;
}
