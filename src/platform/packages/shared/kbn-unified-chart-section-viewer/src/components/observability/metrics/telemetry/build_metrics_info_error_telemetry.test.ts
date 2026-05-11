/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlResponseError } from '../utils/esql_response_error';
import { buildMetricsInfoErrorTelemetry } from './build_metrics_info_error_telemetry';

describe('buildMetricsInfoErrorTelemetry', () => {
  it('maps an EsqlResponseError with full cause to structured fields and drops the reason', () => {
    const err = new EsqlResponseError(
      {
        type: 'verification_exception',
        reason: 'Unknown column [foo] — sensitive query fragment',
      },
      { status: 400 }
    );

    expect(buildMetricsInfoErrorTelemetry(err)).toEqual({
      error_name: 'EsqlResponseError',
      status: 400,
      es_error_type: 'verification_exception',
    });
  });

  it('omits status when the EsqlResponseError carries no status', () => {
    const err = new EsqlResponseError({
      type: 'search_phase_execution_exception',
      reason: 'shard failure',
    });

    const payload = buildMetricsInfoErrorTelemetry(err);
    expect(payload).toEqual({
      error_name: 'EsqlResponseError',
      es_error_type: 'search_phase_execution_exception',
    });
    expect(payload).not.toHaveProperty('status');
  });

  it('omits es_error_type when the EsqlResponseError has no cause type', () => {
    const err = new EsqlResponseError({ reason: 'something' }, { status: 500 });

    const payload = buildMetricsInfoErrorTelemetry(err);
    expect(payload).toEqual({
      error_name: 'EsqlResponseError',
      status: 500,
    });
    expect(payload).not.toHaveProperty('es_error_type');
  });

  it('returns only error_name for a plain Error', () => {
    expect(buildMetricsInfoErrorTelemetry(new Error('network'))).toEqual({
      error_name: 'Error',
    });
  });

  it('preserves the name of a custom Error subclass', () => {
    class CustomFetchError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomFetchError';
      }
    }

    expect(buildMetricsInfoErrorTelemetry(new CustomFetchError('boom'))).toEqual({
      error_name: 'CustomFetchError',
    });
  });

  it('falls back to UnknownError for a string thrown value', () => {
    expect(buildMetricsInfoErrorTelemetry('oops')).toEqual({ error_name: 'UnknownError' });
  });

  it('falls back to UnknownError for undefined', () => {
    expect(buildMetricsInfoErrorTelemetry(undefined)).toEqual({ error_name: 'UnknownError' });
  });

  it('falls back to UnknownError for null', () => {
    expect(buildMetricsInfoErrorTelemetry(null)).toEqual({ error_name: 'UnknownError' });
  });

  it('does not include the error message text in the payload', () => {
    const err = new EsqlResponseError(
      {
        type: 'verification_exception',
        reason: 'Unknown column [host.name]',
      },
      { status: 400 }
    );

    const payload = buildMetricsInfoErrorTelemetry(err);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('Unknown column');
    expect(serialized).not.toContain('host.name');
  });
});
