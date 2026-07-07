/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { QuerySource } from '@kbn/esql-types';
import { QuerySubmitTrigger, getESQLQuerySubmittedTelemetry } from './query_submit_metadata';

const esqlQuery: AggregateQuery = { esql: 'from logs | limit 10' };
const kqlQuery: Query = { query: 'foo: bar', language: 'kuery' };

describe('getESQLQuerySubmittedTelemetry', () => {
  it('maps a search button submit to the SEARCH_BUTTON source', () => {
    expect(
      getESQLQuerySubmittedTelemetry(esqlQuery, { trigger: QuerySubmitTrigger.QUERY_BAR_SUBMIT })
    ).toEqual({ source: QuerySource.SEARCH_BUTTON, query: esqlQuery.esql });
  });

  it('maps a time filter submit to the TIME_FILTER source', () => {
    expect(
      getESQLQuerySubmittedTelemetry(esqlQuery, { trigger: QuerySubmitTrigger.TIME_FILTER })
    ).toEqual({ source: QuerySource.TIME_FILTER, query: esqlQuery.esql });
  });

  it('does not track editor-internal submits (the editor tracks those itself)', () => {
    expect(
      getESQLQuerySubmittedTelemetry(esqlQuery, { trigger: QuerySubmitTrigger.TEXT_BASED_EDITOR })
    ).toBeUndefined();
  });

  it('does not track submits without metadata', () => {
    expect(getESQLQuerySubmittedTelemetry(esqlQuery)).toBeUndefined();
  });

  it('does not track non-ES|QL queries', () => {
    expect(
      getESQLQuerySubmittedTelemetry(kqlQuery, { trigger: QuerySubmitTrigger.QUERY_BAR_SUBMIT })
    ).toBeUndefined();
  });

  it('does not track when there is no query', () => {
    expect(
      getESQLQuerySubmittedTelemetry(undefined, { trigger: QuerySubmitTrigger.QUERY_BAR_SUBMIT })
    ).toBeUndefined();
  });
});
