/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    test('returns token value', async () => {
      mockRequestOnce('/api/v1/saas/auth/_login', { data: { token: 'mocked_token' } });

      const sessionToken = await createCloudSession({
        hostname: 'cloud',
        email: 'viewer@elastic.co',
        password: 'changeme',
        log,
      });
      expect(sessionToken).toBe('mocked_token');
    });

    test('throws error when response has no token', async () => {
      mockRequestOnce('/api/v1/saas/auth/_login', { data: { message: 'no token' } });

      await expect(
        createCloudSession({
          hostname: 'cloud',
          email: 'viewer@elastic.co',
          password: 'changeme',
          log,
        })
      ).rejects.toThrow('Unable to create Cloud session, token is missing.');
    });
  });

  describe('createSAMLRequest', () => {
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
