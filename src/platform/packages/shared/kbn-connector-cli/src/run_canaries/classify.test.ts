/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequestError } from '../create_connectors/kibana_client';
import type { ExecuteConnectorResult } from '../create_connectors/kibana_client';
import { classifyErrorResult, classifyThrown } from './classify';

const errorResult = (overrides: Partial<ExecuteConnectorResult> = {}): ExecuteConnectorResult => ({
  connector_id: 'abc',
  status: 'error',
  message: 'boom',
  ...overrides,
});

describe('classifyErrorResult', () => {
  it.each([401, 403])('classifies HTTP %i as an auth failure', (statusCode) => {
    expect(classifyErrorResult(errorResult({ error_meta: { statusCode } })).outcome).toBe('auth');
  });

  it('classifies a ConnectorAuthorizationError as an auth failure even without a status code', () => {
    const result = errorResult({ error_name: 'ConnectorAuthorizationError' });
    expect(classifyErrorResult(result).outcome).toBe('auth');
  });

  it.each([400, 404, 422, 500, 502, 503])('classifies HTTP %i as an error', (statusCode) => {
    expect(classifyErrorResult(errorResult({ error_meta: { statusCode } })).outcome).toBe('error');
  });

  it.each([408, 429])('classifies HTTP %i as transient', (statusCode) => {
    expect(classifyErrorResult(errorResult({ error_meta: { statusCode } })).outcome).toBe('misc');
  });

  it('classifies an error with no HTTP status as misc and keeps the message', () => {
    const classification = classifyErrorResult(errorResult({ message: 'socket hang up' }));
    expect(classification.outcome).toBe('misc');
    expect(classification.reason).toContain('socket hang up');
  });

  it.each([
    ['Bad credentials', undefined],
    ['Request failed', 'HTTP 401 Unauthorized'],
    ['Forbidden', undefined],
    ['Invalid token', undefined],
  ])('classifies a status-less error mentioning auth (%s) as auth', (message, serviceMessage) => {
    const result = errorResult({ message, service_message: serviceMessage });
    expect(classifyErrorResult(result).outcome).toBe('auth');
  });

  it.each([
    'Request failed with status code 401',
    'HTTP 403',
    'status: 401',
    'HTTP error 403: access denied by policy',
    'Received HTTP/1.1 401',
    'status of 401',
    'Error POSTing to endpoint (HTTP 403)',
    'HTTPS 403 from upstream',
    'HTTPS error 401',
    'status=403',
  ])('classifies a status-less error naming the status ("%s") as auth', (message) => {
    expect(classifyErrorResult(errorResult({ message })).outcome).toBe('auth');
  });

  it.each([
    'returned 14031 rows',
    'Tool call failed after 403 ms',
    'retry in 401s',
    'connect ECONNREFUSED http://403.internal.example/mcp',
  ])('does not treat a status-less error with an unrelated number ("%s") as auth', (message) => {
    expect(classifyErrorResult(errorResult({ message })).outcome).toBe('misc');
  });

  it('ignores a non-numeric status code', () => {
    const result = errorResult({ error_meta: { statusCode: 'nope' } });
    expect(classifyErrorResult(result).outcome).toBe('misc');
  });
});

describe('classifyThrown', () => {
  it('classifies a Kibana 400 as a fixture problem', () => {
    const error = new KibanaRequestError('Invalid params', 400);
    expect(classifyThrown(error).outcome).toBe('fixture');
  });

  it('classifies other Kibana errors as misc', () => {
    expect(classifyThrown(new KibanaRequestError('Not found', 404)).outcome).toBe('misc');
  });

  it('classifies timeouts and network failures as misc', () => {
    expect(classifyThrown(new Error('Request timed out after 60000ms')).outcome).toBe('misc');
    expect(classifyThrown('ECONNREFUSED').outcome).toBe('misc');
  });
});
