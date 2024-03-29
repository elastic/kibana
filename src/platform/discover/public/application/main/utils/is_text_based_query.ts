/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggregateQuery, Query } from '@kbn/es-query';
import { RecordRawType } from '../services/discover_data_state_container';
import { getRawRecordType } from './get_raw_record_type';

/**
 * Checks if the query is of AggregateQuery type
 * @param query
 */
export function isTextBasedQuery(query?: Query | AggregateQuery): query is AggregateQuery {
  return getRawRecordType(query) === RecordRawType.PLAIN;
}
