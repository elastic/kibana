/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  ERROR_CATEGORY,
  classifyChartSectionError,
  getChartSectionErrorMeta,
} from './classify_chart_section_error';
import { EsqlResponseError } from './esql_response_error';

/**
 * Mirrors the error the search interceptor raises when a request fails:
 * `EsError` carries the Elasticsearch cause on `attributes` but drops the HTTP
 * `statusCode`, so only the body kept in `rawResponse` still holds a status.
 */
const createEsErrorLike = (
  cause: Partial<estypes.ErrorCause>,
  options: { status?: number } = {}
): Error =>
  Object.assign(new Error(cause.reason ?? 'es error'), {
    attributes: {
      error: cause,
      ...(options.status === undefined ? {} : { rawResponse: { status: options.status } }),
    },
  });

describe('classifyChartSectionError', () => {
  describe('user_input', () => {
    it('classifies a 400 status as user input', () => {
      const error = new EsqlResponseError(
        { type: 'verification_exception', reason: 'unknown column x' },
        { status: 400 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a 404 status as user input', () => {
      const error = new EsqlResponseError({ type: 'index_not_found_exception' }, { status: 404 });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a parse error type carrying no status as user input', () => {
      const error = new EsqlResponseError({
        type: 'parsing_exception',
        reason: "extraneous input '|' expecting <EOF>",
      });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a verification error type carrying no status as user input', () => {
      const error = new EsqlResponseError({
        type: 'verification_exception',
        reason: 'unknown column x',
      });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a search-interceptor error carrying a 400 body status as user input', () => {
      const error = createEsErrorLike(
        { type: 'parsing_exception', reason: "line 1:42: extraneous input '|' expecting <EOF>" },
        { status: 400 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a status-less search-interceptor error by its cause type', () => {
      const error = createEsErrorLike({
        type: 'verification_exception',
        reason: 'Unknown column [not_a_real_field]',
      });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a status-less search-interceptor error by a nested cause type', () => {
      const error = createEsErrorLike({
        type: 'illegal_argument_exception',
        reason: 'remote cluster rejected the query',
        caused_by: {
          type: 'parsing_exception',
          reason: "line 1:1: mismatched input ':'",
        } as estypes.ErrorCause,
      });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });

    it('classifies a status-less search-interceptor error by a root_cause type', () => {
      const error = createEsErrorLike({
        type: 'search_phase_execution_exception',
        reason: 'all shards failed',
        root_cause: [
          { type: 'verification_exception', reason: 'Unknown column [x]' },
        ] as estypes.ErrorCause[],
      });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.USER_INPUT);
    });
  });

  describe('application', () => {
    it('classifies a 5xx status as an application error', () => {
      const error = new EsqlResponseError(
        { type: 'search_phase_execution_exception', reason: 'all shards failed' },
        { status: 500 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });

    it('prefers a 5xx status over a user-input error type', () => {
      const error = new EsqlResponseError({ type: 'parsing_exception' }, { status: 503 });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });

    it('classifies a 401 status as an application error', () => {
      const error = new EsqlResponseError(
        { type: 'security_exception', reason: 'missing authentication credentials' },
        { status: 401 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });

    it('classifies a 403 status as an application error', () => {
      const error = new EsqlResponseError(
        { type: 'security_exception', reason: 'action is unauthorized' },
        { status: 403 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });

    it('classifies a 429 circuit-breaker status as an application error', () => {
      const error = new EsqlResponseError(
        { type: 'circuit_breaking_exception', reason: 'data too large' },
        { status: 429 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });

    it('classifies a search-interceptor error carrying a 5xx body status as an application error', () => {
      const error = createEsErrorLike(
        { type: 'search_phase_execution_exception', reason: 'all shards failed' },
        { status: 503 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });

    it('classifies a search-interceptor error carrying a 429 circuit-breaker status as an application error', () => {
      const error = createEsErrorLike(
        { type: 'circuit_breaking_exception', reason: 'data too large' },
        { status: 429 }
      );

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.APPLICATION);
    });
  });

  describe('unknown', () => {
    it('classifies an EsqlResponseError with no status and no known type as unknown', () => {
      const error = new EsqlResponseError({ reason: 'something went wrong' });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.UNKNOWN);
    });

    it('classifies an unrecognized error type carrying no status as unknown', () => {
      const error = new EsqlResponseError({ type: 'circuit_breaking_exception' });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.UNKNOWN);
    });

    it('classifies a plain Error as unknown', () => {
      expect(classifyChartSectionError(new Error('network blew up'))).toBe(ERROR_CATEGORY.UNKNOWN);
    });

    it('classifies non-Error values as unknown', () => {
      expect(classifyChartSectionError('plain string')).toBe(ERROR_CATEGORY.UNKNOWN);
      expect(classifyChartSectionError(undefined)).toBe(ERROR_CATEGORY.UNKNOWN);
    });

    it('classifies a status-less search-interceptor error with no known cause type as unknown', () => {
      const error = createEsErrorLike({ type: 'circuit_breaking_exception' });

      expect(classifyChartSectionError(error)).toBe(ERROR_CATEGORY.UNKNOWN);
    });
  });
});

describe('getChartSectionErrorMeta', () => {
  it('reads the type and status off an EsqlResponseError', () => {
    const error = new EsqlResponseError({ type: 'parsing_exception' }, { status: 400 });

    expect(getChartSectionErrorMeta(error)).toEqual({ type: 'parsing_exception', status: 400 });
  });

  it('reads the type and body status off a search-interceptor error', () => {
    const error = createEsErrorLike({ type: 'verification_exception' }, { status: 400 });

    expect(getChartSectionErrorMeta(error)).toEqual({
      type: 'verification_exception',
      status: 400,
    });
  });

  it('falls back to statusCode when the error was not wrapped in EsError', () => {
    const error = Object.assign(new Error('Bad Request'), {
      statusCode: 400,
      attributes: { error: { type: 'parsing_exception' } },
    });

    expect(getChartSectionErrorMeta(error)).toEqual({ type: 'parsing_exception', status: 400 });
  });

  it('returns no metadata for errors that carry no Elasticsearch attributes', () => {
    expect(getChartSectionErrorMeta(new Error('network blew up'))).toEqual({});
    expect(getChartSectionErrorMeta('plain string')).toEqual({});
    expect(getChartSectionErrorMeta(undefined)).toEqual({});
  });
});
