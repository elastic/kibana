/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Url } from 'url';
import { format, parse } from 'url';
import { readKibanaConfig } from './read_kibana_config';
import type { Logger } from '../../lib/utils/create_logger';
import type { RunOptions } from './parse_run_cli_flags';
import { getFetchAgent } from './ssl';
import { getApiKeyHeader, getBasicAuthHeader } from './get_auth_header';

async function getFetchStatus(url: string, apiKey?: string) {
  try {
    const parsedUrl = new URL(url);
    const { username, password } = parsedUrl;
    parsedUrl.username = '';
    parsedUrl.password = '';
    const response = await fetch(parsedUrl.toString(), {
      dispatcher: getFetchAgent(parsedUrl.toString()),
      headers: {
        ...getBasicAuthHeader(username, password),
        ...getApiKeyHeader(apiKey),
      },
    } as RequestInit);
    return response.status;
  } catch (error) {
    return 0;
  }
}

function stripAuthIfCi(url: string) {
  if (process.env.CI?.toLowerCase() === 'true') {
    return format({
      ...parse(url),
      auth: undefined,
    });
  }
  return url;
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, '');
}

async function discoverAuth(parsedTarget: Url) {
  const possibleCredentials = [`admin:changeme`, `elastic:changeme`, `elastic_serverless:changeme`];
  for (const auth of possibleCredentials) {
    const url = format({
      ...parsedTarget,
      auth,
    });

    const status = await getFetchStatus(url);
    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${stripAuthIfCi(format(parsedTarget))}`);
}

async function getKibanaUrl({
  targetKibanaUrl,
  apiKey,
  logger,
}: {
  targetKibanaUrl: string;
  apiKey?: string;
  logger: Logger;
}) {
  try {
    logger.debug(`Checking Kibana URL ${stripAuthIfCi(targetKibanaUrl)} for a redirect`);

    if (apiKey) {
      const status = await getFetchStatus(targetKibanaUrl, apiKey);
      if (status !== 200) {
        throw new Error(`Expected HTTP 200 from ${stripAuthIfCi(targetKibanaUrl)}, got ${status}`);
      }

      return {
        kibanaUrl: targetKibanaUrl.replace(/\/$/, ''),
        kibanaHeaders: getApiKeyHeader(apiKey),
        apiKey,
      };
    }

    const url = new URL(targetKibanaUrl);
    const { username, password } = url;
    url.username = '';
    url.password = '';
    const authHeaders = getBasicAuthHeader(username, password);
    targetKibanaUrl = url.toString();

    const unredirectedResponse = await fetch(targetKibanaUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: authHeaders,
      dispatcher: getFetchAgent(targetKibanaUrl),
    } as RequestInit);

    let discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || targetKibanaUrl;

    // When redirected, it might only return the pathname, so we need to add the base URL back to it
    if (discoveredKibanaUrl.startsWith('/')) {
      url.pathname = discoveredKibanaUrl;
    }

    discoveredKibanaUrl = url.toString();

    const redirectedResponse = await fetch(discoveredKibanaUrl, {
      method: 'HEAD',
      headers: authHeaders,
      dispatcher: getFetchAgent(discoveredKibanaUrl),
    } as RequestInit);

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${stripAuthIfCi(discoveredKibanaUrl)}, got ${
          redirectedResponse.status
        }`
      );
    }

    logger.debug(`Discovered kibana running at: ${stripAuthIfCi(discoveredKibanaUrl)}`);

    return {
      kibanaUrl: discoveredKibanaUrl.replace(/\/$/, ''),
      kibanaHeaders: authHeaders,
      username,
      password,
    };
  } catch (error) {
    throw new Error(
      `Could not connect to Kibana. ${error.message} \n If your Kibana URL differs, consider using '--kibana' parameter to customize it. \n`
    );
  }
}

async function discoverTargetFromKibanaUrl(kibanaUrl: string) {
  const suspectedParsedTargetUrl = parse(getTargetUrlFromKibana(kibanaUrl));

  let targetAuth = suspectedParsedTargetUrl.auth;
  let targetProtocol = suspectedParsedTargetUrl.protocol;
  const urlWithSwitchedProtocol = parse(
    format({
      ...suspectedParsedTargetUrl,
      protocol: suspectedParsedTargetUrl.protocol === 'https:' ? 'http:' : 'https:',
    })
  );
  const errorMessages = `Could not discover Elasticsearch URL based on Kibana URL ${stripAuthIfCi(
    kibanaUrl
  )}.`;

  if (!targetAuth) {
    try {
      targetAuth = await discoverAuth(suspectedParsedTargetUrl);
      targetProtocol = suspectedParsedTargetUrl.protocol;
    } catch (_error) {
      try {
        // Retry with switched protocol
        targetAuth = await discoverAuth(urlWithSwitchedProtocol);
        targetProtocol = urlWithSwitchedProtocol.protocol;
      } catch (error) {
        throw new Error(`${errorMessages} ${error.message}`);
      }
    }
  } else {
    const status = await getFetchStatus(format(suspectedParsedTargetUrl));
    const statusWithSwitchedProtocol = await getFetchStatus(format(urlWithSwitchedProtocol));
    if (status === 0 && statusWithSwitchedProtocol !== 0) {
      targetProtocol = urlWithSwitchedProtocol.protocol;
    }

    if (status === 0 && statusWithSwitchedProtocol === 0) {
      throw new Error(errorMessages);
    }
  }

  return stripTrailingSlash(
    format({
      ...suspectedParsedTargetUrl,
      auth: targetAuth,
      protocol: targetProtocol,
    })
  );
}

function discoverTargetFromKibanaConfig() {
  const config = readKibanaConfig();
  const hosts = config.elasticsearch?.hosts;
  let username = config.elasticsearch?.username;
  if (username === 'kibana_system_user') {
    username = 'elastic';
  }
  const password = config.elasticsearch?.password;
  if (hosts) {
    const parsed = parse(Array.isArray(hosts) ? hosts[0] : hosts);
    return format({
      ...parsed,
      auth: parsed.auth || (username && password ? `${username}:${password}` : undefined),
    });
  }
}

function getTargetUrlFromKibana(kibanaUrl: string) {
  const kbToEs = kibanaUrl.replace('.kb', '.es');

  // If url contains localhost, replace 5601 with 9200
  if (kbToEs.includes('localhost') || kbToEs.includes('127.0.0.1')) {
    return kbToEs.replace(':5601', ':9200');
  }

  return kbToEs;
}

function getKibanaUrlFromTarget(target: string) {
  const esToKb = target.replace('.es', '.kb');
  // If url contains localhost, replace 9200 with 5601
  if (esToKb.includes('localhost') || esToKb.includes('127.0.0.1')) {
    return esToKb.replace(':9200', ':5601');
  }

  return esToKb;
}

function logCertificateWarningsIfNeeded(parsedTarget: Url, parsedKibanaUrl: Url, logger: Logger) {
  if (
    (parsedTarget.protocol === 'https:' || parsedKibanaUrl.protocol === 'https:') &&
    (parsedTarget.hostname === '127.0.0.1' || parsedKibanaUrl.hostname === '127.0.0.1')
  ) {
    logger.warning(
      `WARNING: Self-signed certificate may not work with hostname: '127.0.0.1'. Consider using 'localhost' instead.`
    );
  }
}

export async function getServiceUrls({
  logger,
  target,
  kibana,
  apiKey,
}: RunOptions & { logger: Logger }) {
  if (!target) {
    target = discoverTargetFromKibanaConfig();
    if (!kibana) {
      kibana = 'http://localhost:5601';
      logger.debug(`No target provided, defaulting Kibana to ${kibana}`);
    }
    if (!target) {
      target = await discoverTargetFromKibanaUrl(kibana);
    }
  }

  const parsedTarget = parse(target);

  let auth = parsedTarget.auth;
  let esHeaders;

  if (apiKey) {
    esHeaders = getApiKeyHeader(apiKey);
  } else if (!auth) {
    auth = await discoverAuth(parsedTarget);
  }

  const formattedEsUrl = stripTrailingSlash(
    format({
      ...parsedTarget,
      auth,
    })
  );

  let targetKibanaUrl = kibana || getKibanaUrlFromTarget(formattedEsUrl);
  const parsedKibanaUrl = parse(targetKibanaUrl);

  if (!apiKey) {
    targetKibanaUrl = format({
      ...parsedKibanaUrl,
      auth,
    });
  }

  const { kibanaUrl, kibanaHeaders, username, password } = await getKibanaUrl({
    targetKibanaUrl,
    apiKey,
    logger,
  });

  logCertificateWarningsIfNeeded(parsedTarget, parsedKibanaUrl, logger);

  return {
    kibanaUrl,
    esUrl: formattedEsUrl,
    kibanaHeaders,
    esHeaders,
    username,
    password,
    apiKey,
  };
}
