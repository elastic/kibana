/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  GoogleWorkspaceApiError,
  REQUEST_TIMEOUT_MS,
  arrayField,
  compactParams,
  directoryPath,
  googleRequest,
  nextPageToken,
  nonBlank,
  readGoogleError,
  withoutBookkeeping,
} from './client';
import type { GoogleRequestOptions } from './client';
import { API_URL, createContext, googleError, httpError } from './test_helpers';

const get = (overrides: Partial<GoogleRequestOptions> = {}): GoogleRequestOptions => ({
  method: 'GET',
  path: '/admin/directory/v1/users/jdoe%40example.com',
  target: 'User jdoe@example.com',
  ...overrides,
});

describe('Google Workspace Admin client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('small helpers', () => {
    it('nonBlank treats whitespace-only strings as not set', () => {
      expect(nonBlank('  ')).toBeUndefined();
      expect(nonBlank(undefined)).toBeUndefined();
      expect(nonBlank(' a ')).toBe('a');
    });

    it('compactParams drops unset entries and keeps false and 0', () => {
      expect(compactParams({ a: undefined, b: false, c: 0, d: 'x' })).toEqual({
        b: false,
        c: 0,
        d: 'x',
      });
    });

    it('arrayField returns [] when Google omits the field', () => {
      expect(arrayField({}, 'items')).toEqual([]);
      expect(arrayField('', 'items')).toEqual([]);
      expect(arrayField({ items: [1] }, 'items')).toEqual([1]);
    });

    it('nextPageToken ignores a missing or empty token', () => {
      expect(nextPageToken({})).toBeUndefined();
      expect(nextPageToken({ nextPageToken: '' })).toBeUndefined();
      expect(nextPageToken({ nextPageToken: 'abc' })).toBe('abc');
    });

    it('withoutBookkeeping removes kind and etag only', () => {
      expect(withoutBookkeeping({ kind: 'k', etag: 'e', id: '1' })).toEqual({ id: '1' });
    });

    it.each(['.', '..'])('directoryPath refuses the dot segment %s', (segment) => {
      expect(() => directoryPath('groups', 'g@example.com', 'members', segment)).toThrow(
        'is not a valid identifier'
      );
    });

    it('directoryPath encodes every caller value', () => {
      expect(directoryPath('users', 'a/b?c#d@example.com', 'tokens')).toBe(
        '/admin/directory/v1/users/a%2Fb%3Fc%23d%40example.com/tokens'
      );
    });

    it('readGoogleError reads the message and first reason of the envelope', () => {
      expect(
        readGoogleError({ error: { message: 'Forbidden', errors: [{ reason: 'forbidden' }] } })
      ).toEqual({ message: 'Forbidden', reason: 'forbidden' });
      expect(readGoogleError('not json')).toEqual({ message: undefined, reason: undefined });
    });
  });

  describe('googleRequest', () => {
    it('sends the request below the API URL with a timeout and no redirects', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { id: '1' } });
      await expect(googleRequest(ctx, get({ params: { a: 1 } }))).resolves.toEqual({
        status: 200,
        data: { id: '1' },
      });
      expect(request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${API_URL}/admin/directory/v1/users/jdoe%40example.com`,
        params: { a: 1 },
        data: undefined,
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
      });
    });

    it.each([
      ['a read', 'GET', httpError(429)],
      ['a read', 'GET', httpError(503)],
      ['a read', 'GET', googleError(403, 'Quota exceeded', 'quotaExceeded')],
      ['a change', 'PUT', httpError(429)],
      ['a change', 'POST', httpError(500)],
    ] as const)('sends %s once and does not retry %#', async (_label, method, failure) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(failure);
      await expect(googleRequest(ctx, get({ method }))).rejects.toThrow(GoogleWorkspaceApiError);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('keeps the status and Retry-After on the error for the actions executor', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        Object.assign(googleError(429, 'Too many requests', 'rateLimitExceeded'), {
          response: {
            status: 429,
            statusText: '',
            headers: { 'retry-after': '30', 'x-goog-other': 'not kept' },
            data: { error: { code: 429, message: 'Too many requests' } },
          },
        })
      );
      const error = await googleRequest(ctx, get()).catch((e) => e);
      expect(error.status).toBe(429);
      expect(error.response).toEqual({ status: 429, headers: { 'retry-after': '30' } });
    });

    it('keeps the status without headers when Google sends no Retry-After', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(503));
      const error = await googleRequest(ctx, get()).catch((e) => e);
      expect(error.response).toEqual({ status: 503, headers: {} });
    });

    it('has no response on the error when no answer came back', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(new Error('socket hang up'));
      const error = await googleRequest(ctx, get()).catch((e) => e);
      expect(error.response).toBeUndefined();
    });

    it.each([
      [400, 'invalid', /^Google rejected the request: Bad thing \(invalid\)\.$/],
      [401, 'authError', /authorize the connector again or enter a new access token/],
      [
        403,
        'insufficientPermissions',
        /^The authorized account lacks the scope or admin privilege for this action: Bad thing\.$/,
      ],
      [404, 'notFound', /^User jdoe@example.com not found: Bad thing\.$/],
      [409, 'duplicate', /^Google Workspace error 409: Bad thing \(duplicate\)\.$/],
      [412, 'conditionNotMet', /^Google Workspace error 412: Bad thing/],
    ])('reports %s with its status', async (status, reason, message) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(status, 'Bad thing', reason));
      const error = await googleRequest(ctx, get()).catch((e) => e);
      expect(error).toBeInstanceOf(GoogleWorkspaceApiError);
      expect(error.message).toMatch(message);
      expect(error.status).toBe(status);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports a rate limit and asks to try again later', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        googleError(429, 'Too many concurrent requests', 'rateLimitExceeded')
      );
      await expect(googleRequest(ctx, get())).rejects.toThrow(
        'Google Workspace rate limit reached: Too many concurrent requests. Wait and try again.'
      );
    });

    it('reports a 5xx with its status', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(503));
      await expect(googleRequest(ctx, get())).rejects.toThrow(
        /^Google Workspace is temporarily unavailable: 503\.$/
      );
    });

    it('asks to check the page token on a 503 to a request with a page token', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(503));
      await expect(
        googleRequest(ctx, get({ params: { pageToken: 'not-a-token', maxResults: 100 } }))
      ).rejects.toThrow(
        'Google Workspace is temporarily unavailable: 503. Check pageToken: it must be the nextPageToken of the previous page of the same request'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('says that a change may have been applied after a 5xx or a lost answer', async () => {
      for (const failure of [httpError(500), new Error('timeout of 30000ms exceeded')]) {
        const { ctx, request } = createContext();
        request.mockRejectedValue(failure);
        await expect(googleRequest(ctx, get({ method: 'POST' }))).rejects.toThrow(
          'The change may have been applied: read the current state before you repeat the action.'
        );
        expect(request).toHaveBeenCalledTimes(1);
      }
    });

    it('does not add the change note to a 4xx answer of a change', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(400, 'Invalid Input'));
      await expect(googleRequest(ctx, get({ method: 'POST' }))).rejects.toThrow(
        /^Google rejected the request: Invalid Input\.$/
      );
    });

    it('reports a network error without a response', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(new Error('socket hang up'));
      await expect(googleRequest(ctx, get())).rejects.toThrow(
        'Google Workspace request failed: socket hang up.'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('explains a response over the size limit', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(new Error('maxContentLength size of 1000 exceeded'));
      await expect(googleRequest(ctx, get())).rejects.toThrow(/maxResponseContentLength/);
    });

    it('does not put the access token in an error message', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(401, 'Invalid Credentials', 'authError'));
      const error = await googleRequest(ctx, get()).catch((e) => e);
      expect(error.message).not.toContain('ya29.test-token');
    });
  });
});
