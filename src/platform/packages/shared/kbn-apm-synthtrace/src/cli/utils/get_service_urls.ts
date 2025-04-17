/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';
import { format, parse, Url } from 'url';
import { Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';
import { getFetchAgent } from './ssl';

async function getFetchStatus(url: string) {
  try {
    const response = await fetch(url, {
      agent: getFetchAgent(url),
    });
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
  logger,
}: {
  targetKibanaUrl: string;
  logger: Logger;
}) {
  try {
    logger.debug(`Checking Kibana URL ${stripAuthIfCi(targetKibanaUrl)} for a redirect`);

    const targetAuth = parse(targetKibanaUrl).auth;

    const unredirectedResponse = await fetch(targetKibanaUrl, {
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
      agent: getFetchAgent(targetKibanaUrl),
    });

    const discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || targetKibanaUrl;

    const discoveredKibanaUrlWithAuth = format({
      ...parse(discoveredKibanaUrl),
      auth: targetAuth,
    });

    const redirectedResponse = await fetch(discoveredKibanaUrlWithAuth, {
      method: 'HEAD',
      agent: getFetchAgent(discoveredKibanaUrlWithAuth),
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${stripAuthIfCi(discoveredKibanaUrlWithAuth)}, got ${
          redirectedResponse.status
        }`
      );
    }

    logger.debug(`Discovered kibana running at: ${stripAuthIfCi(discoveredKibanaUrlWithAuth)}`);

    return discoveredKibanaUrlWithAuth.replace(/\/$/, '');
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

export async function getServiceUrls({ logger, target, kibana }: RunOptions & { logger: Logger }) {
  if (!target) {
    if (!kibana) {
      kibana = 'http://localhost:5601';
      logger.debug(`No target provided, defaulting Kibana to ${kibana}`);
    }
    target = await discoverTargetFromKibanaUrl(kibana);
  }

  const parsedTarget = parse(target);

  let auth = parsedTarget.auth;

  if (!parsedTarget.auth) {
    auth = await discoverAuth(parsedTarget);
  }

  const formattedEsUrl = stripTrailingSlash(
    format({
      ...parsedTarget,
      auth,
    })
  );

  const suspectedKibanaUrl = kibana || getKibanaUrlFromTarget(formattedEsUrl);

  const parsedKibanaUrl = parse(suspectedKibanaUrl);

  const kibanaUrlWithAuth = format({
    ...parsedKibanaUrl,
    auth,
  });

  const validatedKibanaUrl = await getKibanaUrl({ targetKibanaUrl: kibanaUrlWithAuth, logger });

  logCertificateWarningsIfNeeded(parsedTarget, parsedKibanaUrl, logger);

  return {
    kibanaUrl: validatedKibanaUrl,
    esUrl: formattedEsUrl,
  };
}
