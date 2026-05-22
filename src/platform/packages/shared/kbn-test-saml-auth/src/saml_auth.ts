/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as delay } from 'timers/promises';
import { createSAMLResponse as createMockedSAMLResponse } from '@kbn/mock-idp-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import util from 'util';
import * as cheerio from 'cheerio';
import type { Cookie } from 'tough-cookie';
import { parse as parseCookie } from 'tough-cookie';
import Url from 'url';
import { randomInt } from 'crypto';
import { isValidUrl } from './helper';
import type {
  CloudSamlSessionParams,
  CreateSamlSessionParams,
  LocalSamlSessionParams,
  RetryParams,
  SAMLCallbackParams,
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

const getCookieFromResponseHeaders = (headers: Headers, body: string, errorMessage: string) => {
  // Headers.getSetCookie() is the Node 22 / undici way to read multi-valued
  // set-cookie headers, jsdom's older polyfill exposes only Headers.get() which
  // returns the first set-cookie value as a string, so we fall back to that.
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headersWithGetSetCookie.getSetCookie
    ? headersWithGetSetCookie.getSetCookie()
    : [headers.get('set-cookie')].filter((c): c is string => Boolean(c));
  if (setCookies.length === 0) {
    throw new Error(`${errorMessage}: no 'set-cookie' header, response.data: ${body}`);
  }

  const cookie = parseCookie(setCookies[0]);
  if (!cookie) {
    throw new Error(errorMessage);
  }

  return cookie;
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

  let attemptsLeft = retryParams.attemptsCount;
  while (attemptsLeft > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const sessionResponse = await fetch(cloudLoginUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (sessionResponse.status !== 200) {
        throw new Error(
          `Failed to create the new cloud session: 'POST ${cloudLoginUrl}' returned ${sessionResponse.status}`
        );
      }

      const data = (await sessionResponse.json()) as Record<string, unknown> | null;
      const token = data?.token as string | undefined;
      if (token) {
        return token;
      }

      const keysToRedact = ['user_id', 'okta_session_id'];
      if (data !== null && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          if (keysToRedact.includes(key)) {
            data[key] = 'REDACTED';
          }
        });

        log.error(`Error occurred, cloud login response: \n${JSON.stringify(data)}`);

        // MFA must be disabled for test accounts
        if (data.mfa_required === true) {
          // Changing MFA configuration requires manual action, skip retry
          attemptsLeft = 0;
          throw new Error(
            `Failed to create the new cloud session: MFA must be disabled for the test account`
          );
        }
      }

      throw new Error(
        `Failed to create the new cloud session: token is missing in response data\n${JSON.stringify(
          data
        )}`
      );
    } catch (ex) {
      clearTimeout(timeoutId);
      if (--attemptsLeft > 0) {
        // log only error message
        log.error(`${ex.message}\nWaiting ${retryParams.attemptDelay} ms before the next attempt`);
        await delay(retryParams.attemptDelay);
      } else {
        log.error(
          `Failed to create the new cloud session with ${retryParams.attemptsCount} attempts for ${email} user`
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
  const url = kbnUrl + '/internal/security/login';
  let samlResponse: Response;
  try {
    samlResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'kbn-version': kbnVersion,
        'x-elastic-internal-origin': 'Kibana',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        providerType: 'saml',
        providerName: 'cloud-saml-kibana',
        currentURL: kbnUrl + '/login?next=%2F"',
      }),
      redirect: 'manual',
    });
  } catch (ex) {
    log.error('Failed to create SAML request');
    throw ex;
  }

  const bodyText = await samlResponse.text();
  const cookie = getCookieFromResponseHeaders(
    samlResponse.headers,
    bodyText,
    'Failed to parse cookie from SAML response headers'
  );

  let location: string | undefined;
  try {
    location = (JSON.parse(bodyText) as { location?: string }).location;
  } catch {
    // body is not JSON, location stays undefined
  }
  if (!location) {
    throw new Error(`Failed to get location from SAML response data: ${bodyText}`);
  }
  if (!isValidUrl(location)) {
    throw new Error(`Location from Kibana SAML request is not a valid url: ${location}`);
  }
  return { location, sid: cookie.value };
};

export const createSAMLResponse = async (params: SAMLResponseValueParams) => {
  const { location, ecSession, email, kbnHost, log } = params;
  let value: string | undefined;
  try {
    const samlResponse = await fetch(location, {
      headers: {
        Cookie: `ec_session=${ecSession}`,
      },
      redirect: 'manual',
    });
    const responseStatus = samlResponse.status;
    const requestId = samlResponse.headers.get('x-request-id') || 'not found';

    if (responseStatus >= 300 && responseStatus < 400) {
      const locationHeader = samlResponse.headers.get('location') || 'not found';
      log.error(
        `Create SAML Response (${location}) failed with status code ${responseStatus}: ${await samlResponse.text()}.\nLocation: ${locationHeader}.\nX-Request-ID: ${requestId}`
      );
    } else if (!samlResponse.ok) {
      log.error(
        `Create SAML Response (${location}) failed with status code ${responseStatus}: ${await samlResponse.text()}.\nX-Request-ID: ${requestId}`
      );
    } else {
      value = cheerio
        .load(await samlResponse.text())('input')
        .attr('value');
    }
  } catch (err) {
    log.error(`Create SAML Response (${location}) failed: ${err.message}`);
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
  maxRetryCount = 3,
}: SAMLCallbackParams) => {
  const encodedResponse = encodeURIComponent(samlResponse);
  const url = kbnHost + '/api/security/saml/callback';
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(sid ? { Cookie: `sid=${sid}` } : {}),
    },
    body: `SAMLResponse=${encodedResponse}`,
    redirect: 'manual',
  };

  let attemptsLeft = maxRetryCount + 1;
  while (attemptsLeft > 0) {
    try {
      const authResponse = await fetch(url, requestInit);
      // SAML callback should return 302
      if (authResponse.status === 302) {
        return getCookieFromResponseHeaders(
          authResponse.headers,
          await authResponse.text(),
          'Failed to get cookie from SAML callback response'
        );
      }

      throw new Error(`SAML callback failed: expected 302, got ${authResponse.status}`, {
        cause: {
          status: authResponse.status, // use response status to retry on 5xx errors
        },
      });
    } catch (ex) {
      // retry for 5xx errors
      if (ex?.cause?.status >= 500) {
        if (--attemptsLeft > 0) {
          // randomize delay to avoid retrying API call in parallel workers concurrently
          const attemptDelay = randomInt(500, 2_500);
          // log only error message
          log.error(`${ex.message}\nWaiting ${attemptDelay} ms before the next attempt`);
          await delay(attemptDelay);
        } else {
          throw new Error(`Retry failed after ${maxRetryCount + 1} attempts: ${ex.message}`);
        }
      } else {
        // exit for non 5xx errors
        // Logging the `Cookie: sid=xxxx` header is safe here since it’s an intermediate, non-authenticated cookie that cannot be reused if leaked.
        log.error(`Request sent: ${util.inspect({ url, ...requestInit })}`);
        throw ex;
      }
    }
  }

  // should never be reached
  throw new Error(`Failed to complete SAML handshake callback`);
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
  const url = kbnHost + '/internal/security/me';
  let meResponse: Response;
  try {
    meResponse = await fetch(url, {
      headers: {
        Cookie: cookie.cookieString(),
        'x-elastic-internal-origin': 'Kibana',
        'content-type': 'application/json',
      },
    });
  } catch (ex) {
    log.error('Failed to fetch user profile data');
    throw ex;
  }

  if (!meResponse.ok) {
    throw new Error(`${meResponse.status}:${await meResponse.text()}`);
  }

  return (await meResponse.json()) as UserProfile;
};

export const createCloudSAMLSession = async (params: CloudSamlSessionParams) => {
  const { hostname, email, password, kbnHost, kbnVersion, log } = params;
  const ecSession = await createCloudSession({ hostname, email, password, log });
  const { location, sid } = await createSAMLRequest(kbnHost, kbnVersion, log);
  const samlResponse = await createSAMLResponse({ location, ecSession, email, kbnHost, log });
  const cookie = await finishSAMLHandshake({ kbnHost, samlResponse, sid, log });
  return new Session(cookie, email);
};

export const createLocalSAMLSession = async (params: LocalSamlSessionParams) => {
  const { username, email, fullname, role, kbnHost, serverless, log } = params;
  const samlResponse = await createMockedSAMLResponse({
    kibanaUrl: kbnHost + '/api/security/saml/callback',
    username,
    full_name: fullname,
    email,
    roles: [role],
    serverless,
  });
  const cookie = await finishSAMLHandshake({ kbnHost, samlResponse, log });
  return new Session(cookie, email);
};
