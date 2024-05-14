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
const mockedHostname = 'cloud';
const mockedEmail = 'viewer@elastic.co';
const mockedPassword = 'changeme';
const mockedKbnHost = 'https://kbn.test.co';
const mockedKbnVersion = '8.12.0';
const mockedToken = 'mocked_token';
const mockedLocation = 'https://cloud.test/saml?SAMLRequest=fVLLbtswEPwVgXe9K6%2F';
const mockedSid = 'Fe26.2**1234567890';
const mockedSamlResponse = 'PD94bWluc2U+';

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
      mockRequestOnce('/api/v1/saas/auth/_login', { data: { token: mockedToken } });

      const sessionToken = await createCloudSession({
        hostname: mockedHostname,
        email: mockedEmail,
        password: mockedPassword,
        log,
      });
      expect(sessionToken).toBe(mockedToken);
    });

    test('throws error when response has no token', async () => {
      mockRequestOnce('/api/v1/saas/auth/_login', { data: { message: 'no token' } });

      await expect(
        createCloudSession({
          hostname: mockedHostname,
          email: mockedEmail,
          password: mockedPassword,
          log,
        })
      ).rejects.toThrow('Unable to create Cloud session, token is missing.');
    });
  });

  describe('createSAMLRequest', () => {
    test('returns { location, sid }', async () => {
      mockRequestOnce('/internal/security/login', {
        data: {
          location: mockedLocation,
        },
        headers: {
          'set-cookie': [`sid=${mockedSid}; Secure; HttpOnly; Path=/`],
        },
      });

      const response = await createSAMLRequest(mockedKbnHost, mockedKbnVersion, log);
      expect(response).toStrictEqual({ location: mockedLocation, sid: mockedSid });
    });

    test(`throws error when response has no 'set-cookie' header`, async () => {
      mockRequestOnce('/internal/security/login', {
        data: {
          location: mockedLocation,
        },
        headers: {},
      });

      expect(createSAMLRequest(mockedKbnHost, mockedKbnVersion, log)).rejects.toThrow(
        `Failed to parse 'set-cookie' header`
      );
    });

    test('throws error when location is not a valid url', async () => {
      const invalidLocation = 'http/.test';
      mockRequestOnce('/internal/security/login', {
        data: {
          location: invalidLocation,
        },
        headers: {
          'set-cookie': [`sid=${mockedSid}; Secure; HttpOnly; Path=/`],
        },
      });

      expect(createSAMLRequest(mockedKbnHost, mockedKbnVersion, log)).rejects.toThrow(
        `Location from Kibana SAML request is not a valid url: ${location}`
      );
    });

    test('throws error when response has no location', async () => {
      const data = { error: 'mocked error' };
      mockRequestOnce('/internal/security/login', {
        data,
        headers: {
          'set-cookie': [`sid=${mockedSid}; Secure; HttpOnly; Path=/`],
        },
      });

      expect(createSAMLRequest(mockedKbnHost, mockedKbnVersion, log)).rejects.toThrow(
        `Failed to get location from SAML response data: ${JSON.stringify(data)}`
      );
    });
  });

  describe('createSAMLResponse', () => {
    test('returns valid saml response', async () => {
      mockGetOnce(mockedLocation, {
        data: `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><input type="hidden" name="SAMLResponse" value="${mockedSamlResponse}"></body></html>`,
      });

      const actualResponse = await createSAMLResponse(
        mockedLocation,
        mockedToken,
        mockedEmail,
        mockedKbnHost,
        log
      );
      expect(actualResponse).toBe(mockedSamlResponse);
    });

    test('throws error when failed to parse SAML response value', async () => {
      mockGetOnce(mockedLocation, {
        data: `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body></body></html>`,
      });

      await expect(createSAMLResponse(mockedLocation, mockedToken, mockedEmail, mockedKbnHost, log))
        .rejects
        .toThrowError(`Failed to parse SAML response value.\nMost likely the '${mockedEmail}' user has no access to the cloud deployment.
Login to ${new URL(mockedLocation).hostname} with the user from '.ftr/role_users.json' file and try to load
${mockedKbnHost} in the same window.`);
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
        kbnHost: mockedKbnHost,
        samlResponse: mockedSamlResponse,
        sid: mockedSid,
        log,
      });
      expect(response.key).toEqual('sid');
      expect(response.value).toEqual(cookieStr);
    });

    test(`throws error when response has no 'set-cookie' header`, async () => {
      mockRequestOnce('/api/security/saml/callback', { headers: {} });

      await expect(
        finishSAMLHandshake({
          kbnHost: mockedKbnHost,
          samlResponse: mockedSamlResponse,
          sid: mockedSid,
          log,
        })
      ).rejects.toThrow(`Failed to parse 'set-cookie' header`);
    });
  });
});
