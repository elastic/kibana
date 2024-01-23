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
import { CloudSamlSessionParams, CreateSamlSessionParams, LocalSamlSessionParams } from './types';

export class Session {
  readonly cookie;
  readonly email;
  readonly fullname;
  constructor(cookie: Cookie, email: string, fullname: string) {
    this.cookie = cookie;
    this.email = email;
    this.fullname = fullname;
  }

  getCookieValue() {
    return this.cookie.value;
  }
}

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

const getSessionCookie = (cookieString: string) => {
  return parseCookie(cookieString);
};

const getCloudHostName = () => {
  const hostname = process.env.TEST_CLOUD_HOST_NAME;
  if (!hostname) {
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

const createCloudSession = async (params: CreateSamlSessionParams) => {
  const { hostname, email, password, log } = params;
  const cloudLoginUrl = getCloudUrl(hostname, '/api/v1/users/_login');
  let sessionResponse: AxiosResponse;
  try {
    sessionResponse = await axios.request({
      url: cloudLoginUrl,
      method: 'post',
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
    });
  } catch (ex) {
    log.error('Failed to create the new cloud session');
    cleanException(cloudLoginUrl, ex);
    throw ex;
  }

  const firstName = sessionResponse?.data?.user?.data?.first_name ?? '';
  const lastName = sessionResponse?.data?.user?.data?.last_name ?? '';
  const firstLastNames = `${firstName} ${lastName}`.trim();
  const fullname = firstLastNames.length > 0 ? firstLastNames : email;
  const token = sessionResponse?.data?.token as string;
  if (!token) {
    log.error(
      `Failed to create cloud session, token is missing in response data: ${JSON.stringify(
        sessionResponse?.data
      )}`
    );
    throw new Error(`Unable to create Cloud session, token is missing.`);
  }
  return { token, fullname };
};

const createSAMLRequest = async (kbnUrl: string, kbnVersion: string, log: ToolingLog) => {
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

  const cookie = getSessionCookie(samlResponse.headers['set-cookie']![0]);
  if (!cookie) {
    throw new Error(`Failed to parse cookie from SAML response headers`);
  }

  const location = samlResponse?.data?.location as string;
  if (!location) {
    throw new Error(
      `Failed to get location from SAML response data: ${JSON.stringify(samlResponse.data)}`
    );
  }
  return { location, sid: cookie.value };
};

const createSAMLResponse = async (url: string, ecSession: string) => {
  const samlResponse = await axios.get(url, {
    headers: {
      Cookie: `ec_session=${ecSession}`,
    },
  });
  const $ = cheerio.load(samlResponse.data);
  const value = $('input').attr('value') ?? '';
  if (value.length === 0) {
    throw new Error('Failed to parse SAML response value');
  }
  return value;
};

const finishSAMLHandshake = async ({
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

  const cookie = getSessionCookie(authResponse!.headers['set-cookie']![0]);
  if (!cookie) {
    throw new Error(`Failed to get cookie from SAML callback response headers`);
  }

  return cookie;
};

export const createCloudSAMLSession = async (params: CloudSamlSessionParams) => {
  const { email, password, kbnHost, kbnVersion, log } = params;
  const hostname = getCloudHostName();
  const { token, fullname } = await createCloudSession({ hostname, email, password, log });
  const { location, sid } = await createSAMLRequest(kbnHost, kbnVersion, log);
  const samlResponse = await createSAMLResponse(location, token);
  const cookie = await finishSAMLHandshake({ kbnHost, samlResponse, sid, log });
  return new Session(cookie, email, fullname);
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
  return new Session(cookie, email, fullname);
};
