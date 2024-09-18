/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosRequestConfig } from 'axios';

jest.mock('axios');
import {
  createCloudSession,
  createSAMLRequest,
  createSAMLResponse,
  finishSAMLHandshake,
} from './saml_auth';

const axiosRequestMock = jest.spyOn(axios, 'request');
const axiosGetMock = jest.spyOn(axios, 'get');

const log = new ToolingLog();

const mockRequestOnce = (mockedPath: string, response: any) => {
  axiosRequestMock.mockImplementationOnce((config: AxiosRequestConfig) => {
    if (config.url?.endsWith(mockedPath)) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unexpected URL: ${config.url}`));
  });
};

const mockGetOnce = (mockedUrl: string, response: any) => {
  axiosGetMock.mockImplementationOnce((url: string) => {
    if (url === mockedUrl) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unexpected URL`));
  });
};

describe('saml_auth', () => {
  describe('createCloudSession', () => {
    afterEach(() => {
      axiosRequestMock.mockClear();
    });
    test('returns token value', async () => {
      mockRequestOnce('/api/v1/saas/auth/_login', { data: { token: 'mocked_token' }, status: 200 });

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
      let callCount = 0;
      axiosRequestMock.mockImplementation((config: AxiosRequestConfig) => {
        if (config.url?.endsWith('/api/v1/saas/auth/_login')) {
          callCount += 1;
          if (callCount !== 3) {
            return Promise.resolve({ data: { message: 'no token' }, status: 503 });
          } else {
            return Promise.resolve({
              data: { token: 'mocked_token' },
              status: 200,
            });
          }
        }
        return Promise.reject(new Error(`Unexpected URL: ${config.url}`));
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
      axiosRequestMock.mockImplementation((config: AxiosRequestConfig) => {
        if (config.url?.endsWith('/api/v1/saas/auth/_login')) {
          return Promise.resolve({ data: { message: 'no token' }, status: 503 });
        }
        return Promise.reject(new Error(`Unexpected URL: ${config.url}`));
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
      axiosRequestMock.mockImplementation((config: AxiosRequestConfig) => {
        if (config.url?.endsWith('/api/v1/saas/auth/_login')) {
          return Promise.resolve({
            data: { user_id: 1234, okta_session_id: 5678, authenticated: false },
            status: 200,
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${config.url}`));
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
  });

  describe('createSAMLRequest', () => {
    afterEach(() => {
      axiosRequestMock.mockClear();
    });
    test('returns { location, sid }', async () => {
      mockRequestOnce('/internal/security/login', {
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
      mockRequestOnce('/internal/security/login', {
        data: {
          location: 'https://cloud.test/saml?SAMLRequest=fVLLbtswEPwVgXe9K6%2F',
        },
        headers: {},
      });

      expect(createSAMLRequest('https://kbn.test.co', '8.12.0', log)).rejects.toThrow(
        `Failed to parse 'set-cookie' header`
      );
    });

    test('throws error when location is not a valid url', async () => {
      mockRequestOnce('/internal/security/login', {
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
      mockRequestOnce('/internal/security/login', {
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
      axiosGetMock.mockClear();
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
      mockGetOnce(location, {
        data: `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><input type="hidden" name="SAMLResponse" value="PD94bWluc2U+"></body></html>`,
      });

      const actualResponse = await createSAMLResponse(createSAMLResponseParams);
      expect(actualResponse).toBe('PD94bWluc2U+');
    });

    test('throws error when failed to parse SAML response value', async () => {
      mockGetOnce(location, {
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
    afterEach(() => {
      axiosRequestMock.mockClear();
    });
    const cookieStr = 'mocked_cookie';
    test('returns valid cookie', async () => {
      mockRequestOnce('/api/security/saml/callback', {
        headers: {
          'set-cookie': [`sid=${cookieStr}; Secure; HttpOnly; Path=/`],
        },
      });

      const response = await finishSAMLHandshake({
        kbnHost: 'https://kbn.test.co',
        samlResponse: 'PD94bWluc2U+',
        sid: 'Fe26.2**1234567890',
        log,
      });
      expect(response.key).toEqual('sid');
      expect(response.value).toEqual(cookieStr);
    });

    test(`throws error when response has no 'set-cookie' header`, async () => {
      mockRequestOnce('/api/security/saml/callback', { headers: {} });

      await expect(
        finishSAMLHandshake({
          kbnHost: 'https://kbn.test.co',
          samlResponse: 'PD94bWluc2U+',
          sid: 'Fe26.2**1234567890',
          log,
        })
      ).rejects.toThrow(`Failed to parse 'set-cookie' header`);
    });
  });
});
