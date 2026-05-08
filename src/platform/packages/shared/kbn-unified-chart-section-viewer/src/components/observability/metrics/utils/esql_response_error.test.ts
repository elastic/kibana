/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type EsqlResponseErrorCause,
  EsqlResponseError,
  extractEsqlEmbeddedError,
  formatErrorCause,
} from './esql_response_error';

describe('formatErrorCause', () => {
  it('returns message from error type and reason', () => {
    expect(
      formatErrorCause({
        type: 'remote_transport_exception',
        reason: 'ccs query failed',
      })
    ).toBe('remote_transport_exception: ccs query failed');
  });

  it('returns message from root_cause when type and reason are missing', () => {
    expect(
      formatErrorCause({
        root_cause: [{ type: 'index_not_found_exception', reason: 'no such index [metrics-*]' }],
      })
    ).toBe('index_not_found_exception: no such index [metrics-*]');
  });

  it('returns generic message for empty error object', () => {
    expect(formatErrorCause({})).toBe('Elasticsearch returned an error');
  });
});

describe('extractEsqlEmbeddedError', () => {
  it('returns cause when response has error object (no top-level status)', () => {
    expect(
      extractEsqlEmbeddedError({
        error: { type: 'remote_transport_exception', reason: 'ccs query failed' },
      })
    ).toEqual({
      cause: {
        type: 'remote_transport_exception',
        reason: 'ccs query failed',
      },
      status: undefined,
    });
  });

  it('returns undefined when response has no error object', () => {
    expect(extractEsqlEmbeddedError({ columns: [], values: [] })).toBeUndefined();
  });

  it('returns undefined when error is null', () => {
    expect(extractEsqlEmbeddedError({ error: null })).toBeUndefined();
  });

  it('returns undefined when error is not an object', () => {
    expect(extractEsqlEmbeddedError({ error: 'not-an-object' })).toBeUndefined();
  });

  it('returns cause and top-level status when present', () => {
    expect(
      extractEsqlEmbeddedError({
        error: { type: 'remote_transport_exception', reason: 'ccs failed' },
        status: 400,
      })
    ).toEqual({
      cause: { type: 'remote_transport_exception', reason: 'ccs failed' },
      status: 400,
    });
  });

  it('leaves status undefined when absent or not a finite number', () => {
    expect(
      extractEsqlEmbeddedError({
        error: { type: 'x', reason: 'y' },
      })
    ).toEqual({ cause: { type: 'x', reason: 'y' }, status: undefined });

    expect(
      extractEsqlEmbeddedError({
        error: { type: 'x', reason: 'y' },
        status: '400',
      } as object)
    ).toEqual({ cause: { type: 'x', reason: 'y' }, status: undefined });

    expect(
      extractEsqlEmbeddedError({
        error: { type: 'x', reason: 'y' },
        status: Number.NaN,
      })
    ).toEqual({ cause: { type: 'x', reason: 'y' }, status: undefined });
  });
});

describe('EsqlResponseError', () => {
  it('extends Error with name, message, and copied fields', () => {
    const err = new EsqlResponseError({
      type: 'illegal_argument_exception',
      reason: 'bad request',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(EsqlResponseError);
    expect(err.name).toBe('EsqlResponseError');
    expect(err.message).toBe('illegal_argument_exception: bad request');
    expect(err.type).toBe('illegal_argument_exception');
    expect(err.reason).toBe('bad request');
    expect(err.rootCause).toBeUndefined();
  });

  it('copies root_cause to rootCause', () => {
    const rootCause = [{ type: 'shard_failure', reason: 'failed on node-1' }];
    const err = new EsqlResponseError({ root_cause: rootCause });

    expect(err.rootCause).toEqual(rootCause);
  });

  it('normalizes null reason to undefined (Elasticsearch types allow null)', () => {
    const cause = { type: 'x', reason: null } as EsqlResponseErrorCause;
    const err = new EsqlResponseError(cause);

    expect(err.reason).toBeUndefined();
    expect(err.message).toBe('x');
  });

  it('stores optional Elasticsearch payload status', () => {
    const err = new EsqlResponseError(
      { type: 'remote_transport_exception', reason: 'ccs failed' },
      { status: 400 }
    );

    expect(err.status).toBe(400);
  });
});
