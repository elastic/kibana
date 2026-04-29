/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';

jest.mock('axios');
import {
  createCloudSession,
  createSAMLRequest,
  createSAMLResponse,
  finishSAMLHandshake,
} from './saml_auth';

const axiosRequestMock = jest.spyOn(axios, 'request');
const axiosGetMock = jest.spyOn(axios, 'get');

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn(() => Promise.resolve()),
}));

describe('saml_auth', () => {
  const log = new ToolingLog();

  describe('createCloudSession', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('returns token value', async () => {
      axiosRequestMock.mockResolvedValueOnce({
        data: { token: 'mocked_token' },
        status: 200,
      });

      const sessionToken = await createCloudSession({
        hostname: 'cloud',
        email: 'viewer@elastic.co',
        password: 'changeme',
        log,
      });
      expect(sessionToken).toBe('mocked_token');
      expect(axiosRequestMock).toBeCalledTimes(1);
    });

    test('retries until response has the token value', async () => {
      axiosRequestMock
        .mockResolvedValueOnce({ data: { message: 'no token' }, status: 503 })
        .mockResolvedValueOnce({ data: { message: 'no token' }, status: 503 })
        .mockResolvedValueOnce({
          data: { token: 'mocked_token' },
          status: 200,
        });

      const sessionToken = await createCloudSession(
        {
          hostname: 'cloud',
          email: 'viewer@elastic.co',
          password: 'changeme',
          log,
        },
        {
          attemptsCount: 3,
          attemptDelay: 100,
        }
      );

      expect(sessionToken).toBe('mocked_token');
      expect(axiosRequestMock).toBeCalledTimes(3);
    });

    test('retries and throws error when response code is not 200', async () => {
      axiosRequestMock.mockResolvedValue({ data: { message: 'no token' }, status: 503 });

      await expect(
        createCloudSession(
          {
            hostname: 'cloud',
            email: 'viewer@elastic.co',
            password: 'changeme',
            log,
          },
          {
            attemptsCount: 2,
            attemptDelay: 100,
          }
        )
      ).rejects.toThrow(
        `Failed to create the new cloud session: 'POST https://cloud/api/v1/saas/auth/_login' returned 503`
      );
      expect(axiosRequestMock).toBeCalledTimes(2);
    });

    test('retries and throws error when response has no token value', async () => {
      axiosRequestMock.mockResolvedValue({
        data: { user_id: 1234, okta_session_id: 5678, authenticated: false },
        status: 200,
      });

      await expect(
        createCloudSession(
          {
            hostname: 'cloud',
            email: 'viewer@elastic.co',
            password: 'changeme',
            log,
          },
          {
            attemptsCount: 3,
            attemptDelay: 100,
          }
        )
      ).rejects.toThrow(
        `Failed to create the new cloud session: token is missing in response data\n{"user_id":"REDACTED","okta_session_id":"REDACTED","authenticated":false}`
      );
      expect(axiosRequestMock).toBeCalledTimes(3);
    });

    test(`throws error when retry 'attemptsCount' is below 1`, async () => {
      axiosRequestMock.mockResolvedValue({ data: { message: 'no token' }, status: 503 });

      await expect(
        createCloudSession(
          {
            hostname: 'cloud',
            email: 'viewer@elastic.co',
            password: 'changeme',
            log,
          },
          {
            attemptsCount: 0,
            attemptDelay: 100,
          }
        )
      ).rejects.toThrow(
        'Failed to create the new cloud session, check retry arguments: {"attemptsCount":0,"attemptDelay":100}'
      );
    });

    test(`should fail without retry when response has 'mfa_required: true'`, async () => {
      axiosRequestMock.mockResolvedValue({
        data: { user_id: 12345, authenticated: false, mfa_required: true },
        status: 200,
      });

      await expect(
        createCloudSession(
          {
            hostname: 'cloud',
            email: 'viewer@elastic.co',
            password: 'changeme',
            log,
          },
          {
            attemptsCount: 3,
            attemptDelay: 100,
          }
        )
      ).rejects.toThrow(
        'Failed to create the new cloud session: MFA must be disabled for the test account'
      );
      expect(axiosRequestMock).toBeCalledTimes(1);
    });
  });

  describe('createSAMLRequest', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('returns { location, sid }', async () => {
      axiosRequestMock.mockResolvedValue({
        data: {
          location: 'https://cloud.test/saml?SAMLRequest=fVLLbtswEPwVgXe9K6%2F',
        },
        headers: {
          'set-cookie': [`sid=Fe26.2**1234567890; Secure; HttpOnly; Path=/`],
        },
      });

      const response = await createSAMLRequest('https://kbn.test.co', '8.12.0', log);
      expect(response).toStrictEqual({
        location: 'https://cloud.test/saml?SAMLRequest=fVLLbtswEPwVgXe9K6%2F',
        sid: 'Fe26.2**1234567890',
      });
    });

    test(`throws error when response has no 'set-cookie' header`, async () => {
      axiosRequestMock.mockResolvedValue({
        data: {
          location: 'https://cloud.test/saml?SAMLRequest=fVLLbtswEPwVgXe9K6%2F',
        },
        headers: {},
      });

      expect(createSAMLRequest('https://kbn.test.co', '8.12.0', log)).rejects.toThrow(
        /Failed to parse cookie from SAML response headers: no 'set-cookie' header, response.data:/
      );
    });

    test('throws error when location is not a valid url', async () => {
      axiosRequestMock.mockResolvedValue({
        data: {
          location: 'http/.test',
        },
        headers: {
          'set-cookie': [`sid=Fe26.2**1234567890; Secure; HttpOnly; Path=/`],
        },
      });

      expect(createSAMLRequest('https://kbn.test.co', '8.12.0', log)).rejects.toThrow(
        `Location from Kibana SAML request is not a valid url: http/.test`
      );
    });

    test('throws error when response has no location', async () => {
      const data = { error: 'mocked error' };
      axiosRequestMock.mockResolvedValue({
        data,
        headers: {
          'set-cookie': [`sid=Fe26.2**1234567890; Secure; HttpOnly; Path=/`],
        },
      });

      expect(createSAMLRequest('https://kbn.test.co', '8.12.0', log)).rejects.toThrow(
        `Failed to get location from SAML response data: ${JSON.stringify(data)}`
      );
    });
  });

  describe('createSAMLResponse', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    const location = 'https://cloud.test/saml?SAMLRequest=fVLLbtswEPwVgXe9K6%2F';
    const createSAMLResponseParams = {
      location,
      ecSession: 'mocked_token',
      email: 'viewer@elastic.co',
      kbnHost: 'https://kbn.test.co',
      log,
    };

    test('returns valid saml response', async () => {
      axiosGetMock.mockResolvedValueOnce({
        data: `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><input type="hidden" name="SAMLResponse" value="PD94bWluc2U+"></body></html>`,
      });

      const actualResponse = await createSAMLResponse(createSAMLResponseParams);
      expect(actualResponse).toBe('PD94bWluc2U+');
    });

    test('throws error when failed to parse SAML response value', async () => {
      axiosGetMock.mockResolvedValueOnce({
        data: `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body></body></html>`,
      });

      await expect(createSAMLResponse(createSAMLResponseParams)).rejects
        .toThrowError(`Failed to parse SAML response value.\nMost likely the 'viewer@elastic.co' user has no access to the cloud deployment.
Login to ${
        new URL(location).hostname
      } with the user from '.ftr/role_users.json' file and try to load
https://kbn.test.co in the same window.`);
    });
  });

  describe('finishSAMLHandshake', () => {
    const params = {
      samlResponse: 'mockSAMLResponse',
      kbnHost: 'https://kbn.test.co',
      sid: 'Fe26.2**1234567890',
      log,
    };
    const cookieStr = 'mocked_cookie';
    const retryCount = 3;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return cookie on 302 response', async () => {
      axiosRequestMock.mockResolvedValue({
        status: 302,
        headers: {
          'set-cookie': [`sid=${cookieStr}; Secure; HttpOnly; Path=/`],
        },
      });

      const response = await finishSAMLHandshake(params);
      expect(response.key).toEqual('sid');
      expect(response.value).toEqual(cookieStr);
      expect(axiosRequestMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error on 4xx response without retrying', async () => {
      axiosRequestMock.mockResolvedValue({ status: 401 });

      await expect(finishSAMLHandshake(params)).rejects.toThrow(
        'SAML callback failed: expected 302, got 401'
      );
      expect(axiosRequestMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx response and succeed on 302 response', async () => {
      axiosRequestMock
        .mockResolvedValueOnce({ status: 503 }) // First attempt fails (5xx), retrying
        .mockResolvedValueOnce({
          status: 302,
          headers: {
            'set-cookie': [`sid=${cookieStr}; Secure; HttpOnly; Path=/`],
          },
        }); // Second attempt succeeds

      const response = await finishSAMLHandshake(params);
      expect(response.key).toEqual('sid');
      expect(response.value).toEqual(cookieStr);
      expect(axiosRequestMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx response and fail after max attempts', async () => {
      const attemptsCount = retryCount + 1;
      axiosRequestMock.mockResolvedValue({ status: 503 });

      await expect(finishSAMLHandshake(params)).rejects.toThrow(
        `Retry failed after ${attemptsCount} attempts: SAML callback failed: expected 302, got 503`
      );
      expect(axiosRequestMock).toHaveBeenCalledTimes(attemptsCount);
    });

    it('should stop retrying if a later response is 4xx', async () => {
      axiosRequestMock
        .mockResolvedValueOnce({ status: 503 }) // First attempt fails (5xx), retrying
        .mockResolvedValueOnce({ status: 400 }); // Second attempt gets a 4xx (stop retrying)

      await expect(finishSAMLHandshake(params)).rejects.toThrow(
        'SAML callback failed: expected 302, got 400'
      );
      expect(axiosRequestMock).toHaveBeenCalledTimes(2);
    });
  });
});
