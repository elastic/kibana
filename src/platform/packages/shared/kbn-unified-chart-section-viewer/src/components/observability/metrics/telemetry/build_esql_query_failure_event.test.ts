/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEsqlQueryFailureEvent } from './build_esql_query_failure_event';
import { EsqlResponseError } from '../../../../common/errors/esql_response_error';
import { METRICS_PROFILE_TELEMETRY_NAME } from './constants';

const TS_QUERY = 'TS metrics-* | LIMIT 10';

describe('buildEsqlQueryFailureEvent', () => {
  it('classifies a circuit breaker as a resource limit', () => {
    const error = new EsqlResponseError(
      { type: 'circuit_breaking_exception', reason: 'data too large' },
      { status: 429 }
    );

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: TS_QUERY })).toEqual({
      error_type: 'circuit_breaking_exception',
      error_category: 'resource_limit',
      status_code: 429,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('classifies a rejected execution as a resource limit', () => {
    const error = new EsqlResponseError(
      { type: 'es_rejected_execution_exception', reason: 'queue capacity reached' },
      { status: 429 }
    );

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: TS_QUERY })).toEqual({
      error_type: 'es_rejected_execution_exception',
      error_category: 'resource_limit',
      status_code: 429,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('reports the resource-limit cause nested under a generic wrapper', () => {
    const error = Object.assign(new Error('all shards failed'), {
      attributes: {
        error: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          root_cause: [{ type: 'circuit_breaking_exception', reason: 'data too large' }],
        },
        rawResponse: { status: 429 },
      },
    });

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: TS_QUERY })).toEqual({
      error_type: 'circuit_breaking_exception',
      error_category: 'resource_limit',
      status_code: 429,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('reports the resource-limit cause nested under an embedded-error wrapper', () => {
    const error = new EsqlResponseError(
      {
        type: 'search_phase_execution_exception',
        reason: 'all shards failed',
        caused_by: { type: 'circuit_breaking_exception', reason: 'data too large' },
      },
      { status: 429 }
    );

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: TS_QUERY })).toEqual({
      error_type: 'circuit_breaking_exception',
      error_category: 'resource_limit',
      status_code: 429,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('classifies a rejected query as user input', () => {
    const error = new EsqlResponseError(
      { type: 'parsing_exception', reason: "extraneous input '|' expecting <EOF>" },
      { status: 400 }
    );

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: TS_QUERY })).toEqual({
      error_type: 'parsing_exception',
      error_category: 'user_input',
      status_code: 400,
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('reads the source command off a FROM query', () => {
    const error = new EsqlResponseError({ type: 'verification_exception' }, { status: 400 });

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: 'FROM metrics-*' })?.query_type).toBe(
      'FROM'
    );
  });

  it('falls back to an unknown query type when no source command can be parsed', () => {
    const error = new EsqlResponseError({ type: 'verification_exception' }, { status: 400 });

    expect(buildEsqlQueryFailureEvent({ error, esqlQuery: '' })?.query_type).toBe('unknown');
  });

  it('leaves the Elasticsearch metadata unset for errors that carry none', () => {
    expect(
      buildEsqlQueryFailureEvent({ error: new Error('network blew up'), esqlQuery: TS_QUERY })
    ).toEqual({
      error_category: 'unknown',
      query_type: 'TS',
      profile: METRICS_PROFILE_TELEMETRY_NAME,
    });
  });

  it('does not report a cancelled refetch', () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    expect(buildEsqlQueryFailureEvent({ error: abortError, esqlQuery: TS_QUERY })).toBeUndefined();
  });

  it('does not report non-Error rejections', () => {
    expect(
      buildEsqlQueryFailureEvent({ error: 'plain string', esqlQuery: TS_QUERY })
    ).toBeUndefined();
    expect(buildEsqlQueryFailureEvent({ error: undefined, esqlQuery: TS_QUERY })).toBeUndefined();
  });
});
