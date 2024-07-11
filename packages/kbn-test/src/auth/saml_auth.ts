/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSAMLResponse as createMockedSAMLResponse } from '@kbn/mock-idp-utils';
import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { Cookie, parse as parseCookie } from 'tough-cookie';
import Url from 'url';
import { isValidHostname, isValidUrl } from './helper';
import {
  CloudSamlSessionParams,
  CreateSamlSessionParams,
  LocalSamlSessionParams,
  RetryParams,
  SAMLResponseValueParams,
  UserProfile,
} from './types';

export class Session {
  readonly cookie;
  readonly email;
  constructor(cookie: Cookie, email: string) {
    this.cookie = cookie;
    this.email = email;
  }

  getCookieValue() {
    return this.cookie.value;
  }
}

const REQUEST_TIMEOUT_MS = 60_000;

const cleanException = (url: string, ex: any) => {
  if (ex.isAxiosError) {
    ex.url = url;
    if (ex.response?.data) {
      if (ex.response.data?.message) {
        ex.response_message = ex.response.data.message;
      } else {
        ex.data = ex.response.data;
      }
    }
    ex.config = { REDACTED: 'REDACTED' };
    ex.request = { REDACTED: 'REDACTED' };
    ex.response = { REDACTED: 'REDACTED' };
  }
};

const getCookieFromResponseHeaders = (response: AxiosResponse, errorMessage: string) => {
  const setCookieHeader = response?.headers['set-cookie'];
  if (!setCookieHeader) {
    throw new Error(`Failed to parse 'set-cookie' header`);
  }

  const cookie = parseCookie(setCookieHeader![0]);
  if (!cookie) {
    throw new Error(errorMessage);
  }

  return cookie;
};

const getCloudHostName = () => {
  const hostname = process.env.TEST_CLOUD_HOST_NAME;
  if (!hostname || !isValidHostname(hostname)) {
    throw new Error('SAML Authentication requires TEST_CLOUD_HOST_NAME env variable to be set');
  }

  return hostname;
};

const getCloudUrl = (hostname: string, pathname: string) => {
  return Url.format({
    protocol: 'https',
    hostname,
    pathname,
  });
};

export const createCloudSession = async (
  params: CreateSamlSessionParams,
  retryParams: RetryParams = {
    attemptsCount: 3,
    attemptDelay: 15_000,
  }
): Promise<string> => {
  const { hostname, email, password, log } = params;
  const cloudLoginUrl = getCloudUrl(hostname, '/api/v1/saas/auth/_login');
  let sessionResponse: AxiosResponse | undefined;
  const requestConfig = (cloudUrl: string) => {
    return {
      url: cloudUrl,
      method: 'post',
      timeout: REQUEST_TIMEOUT_MS,
      data: {
        email,
        password,
      },
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      validateStatus: () => true,
      maxRedirects: 0,
    };
  };

  let attemptsLeft = retryParams.attemptsCount;
  while (attemptsLeft > 0) {
    try {
      sessionResponse = await axios.request(requestConfig(cloudLoginUrl));
      if (sessionResponse?.status !== 200) {
        throw new Error(
          `Failed to create the new cloud session: 'POST ${cloudLoginUrl}' returned ${sessionResponse?.status}`
        );
      } else {
        const token = sessionResponse?.data?.token as string;
        if (token) {
          return token;
        } else {
          const keysToRedact = ['user_id', 'okta_session_id'];
          const data = sessionResponse?.data;
          if (data !== null && typeof data === 'object') {
            Object.keys(data).forEach((key) => {
              if (keysToRedact.includes(key)) {
                data[key] = 'REDACTED';
              }
            });
          }
          throw new Error(
            `Failed to create the new cloud session: token is missing in response data\n${JSON.stringify(
              data
            )}`
          );
        }
      }
    } catch (ex) {
      cleanException(cloudLoginUrl, ex);
      if (--attemptsLeft > 0) {
        // log only error message
        log.error(`${ex.message}\nWaiting ${retryParams.attemptDelay} ms before the next attempt`);
        await new Promise((resolve) => setTimeout(resolve, retryParams.attemptDelay));
      } else {
        log.error(
          `Failed to create the new cloud session with ${retryParams.attemptsCount} attempts`
        );
        // throw original error with stacktrace
        throw ex;
      }
    }
  }

  // should never be reached
  throw new Error(
    `Failed to create the new cloud session, check retry arguments: ${JSON.stringify(retryParams)}`
  );
};

export const createSAMLRequest = async (kbnUrl: string, kbnVersion: string, log: ToolingLog) => {
  let samlResponse: AxiosResponse;
  const url = kbnUrl + '/internal/security/login';
  try {
    samlResponse = await axios.request({
      url,
      method: 'post',
      data: {
        providerType: 'saml',
        providerName: 'cloud-saml-kibana',
        currentURL: kbnUrl + '/login?next=%2F"',
      },
      headers: {
        'kbn-version': kbnVersion,
        'x-elastic-internal-origin': 'Kibana',
        'content-type': 'application/json',
      },
      validateStatus: () => true,
      maxRedirects: 0,
    });
  } catch (ex) {
    log.error('Failed to create SAML request');
    cleanException(url, ex);
    throw ex;
  }

  const cookie = getCookieFromResponseHeaders(
    samlResponse,
    'Failed to parse cookie from SAML response headers'
  );

  const location = samlResponse?.data?.location as string;
  if (!location) {
    throw new Error(
      `Failed to get location from SAML response data: ${JSON.stringify(samlResponse.data)}`
    );
  }
  if (!isValidUrl(location)) {
    throw new Error(`Location from Kibana SAML request is not a valid url: ${location}`);
  }
  return { location, sid: cookie.value };
};

export const createSAMLResponse = async (params: SAMLResponseValueParams) => {
  const { location, ecSession, email, kbnHost, log } = params;
  let samlResponse: AxiosResponse;
  let value: string | undefined;
  try {
    samlResponse = await axios.get(location, {
      headers: {
        Cookie: `ec_session=${ecSession}`,
      },
      maxRedirects: 0,
    });
    const $ = cheerio.load(samlResponse.data);
    value = $('input').attr('value');
  } catch (err) {
    if (err.isAxiosError) {
      log.error(
        `Create SAML Response failed with status code ${err?.response?.status}: ${err?.response?.data}`
      );
    }
  }

  if (!value) {
    const hostname = new URL(location).hostname;
    throw new Error(
      `Failed to parse SAML response value.\nMost likely the '${email}' user has no access to the cloud deployment.
Login to ${hostname} with the user from '.ftr/role_users.json' file and try to load
${kbnHost} in the same window.`
    );
  }

  return value;
};

export const finishSAMLHandshake = async ({
  kbnHost,
  samlResponse,
  sid,
  log,
}: {
  kbnHost: string;
  samlResponse: string;
  sid?: string;
  log: ToolingLog;
}) => {
  const encodedResponse = encodeURIComponent(samlResponse);
  const url = kbnHost + '/api/security/saml/callback';
  let authResponse: AxiosResponse;

  try {
    authResponse = await axios.request({
      url,
      method: 'post',
      data: `SAMLResponse=${encodedResponse}`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...(sid ? { Cookie: `sid=${sid}` } : {}),
      },
      validateStatus: () => true,
      maxRedirects: 0,
    });
  } catch (ex) {
    log.error('Failed to call SAML callback');
    cleanException(url, ex);
    throw ex;
  }

  return getCookieFromResponseHeaders(
    authResponse,
    'Failed to get cookie from SAML callback response headers'
  );
};

export const getSecurityProfile = async ({
  kbnHost,
  cookie,
  log,
}: {
  kbnHost: string;
  cookie: Cookie;
  log: ToolingLog;
}) => {
  let meResponse: AxiosResponse<UserProfile>;
  const url = kbnHost + '/internal/security/me';
  try {
    meResponse = (await axios.get(url, {
      headers: {
        Cookie: cookie.cookieString(),
        'x-elastic-internal-origin': 'Kibana',
        'content-type': 'application/json',
      },
    })) as AxiosResponse<UserProfile>;
  } catch (ex) {
    log.error('Failed to fetch user profile data');
    cleanException(url, ex);
    throw ex;
  }

  return meResponse.data;
};

export const createCloudSAMLSession = async (params: CloudSamlSessionParams) => {
  const { email, password, kbnHost, kbnVersion, log } = params;
  const hostname = getCloudHostName();
  const ecSession = await createCloudSession({ hostname, email, password, log });
  const { location, sid } = await createSAMLRequest(kbnHost, kbnVersion, log);
  const samlResponse = await createSAMLResponse({ location, ecSession, email, kbnHost, log });
  const cookie = await finishSAMLHandshake({ kbnHost, samlResponse, sid, log });
  return new Session(cookie, email);
};

export const createLocalSAMLSession = async (params: LocalSamlSessionParams) => {
  const { username, email, fullname, role, kbnHost, log } = params;
  const samlResponse = await createMockedSAMLResponse({
    kibanaUrl: kbnHost + '/api/security/saml/callback',
    username,
    full_name: fullname,
    email,
    roles: [role],
  });
  const cookie = await finishSAMLHandshake({ kbnHost, samlResponse, log });
  return new Session(cookie, email);
};
