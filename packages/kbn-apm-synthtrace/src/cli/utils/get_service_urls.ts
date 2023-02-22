/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import { format, parse, Url } from 'url';
import { Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';

async function discoverAuth(parsedTarget: Url) {
  const possibleCredentials = [`admin:changeme`, `elastic:changeme`];
  for (const auth of possibleCredentials) {
    const url = format({
      ...parsedTarget,
      auth,
    });
    let status: number;
    try {
      const response = await fetch(url);
      status = response.status;
    } catch (err) {
      status = 0;
    }

    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${format(parsedTarget)}`);
}

async function getKibanaUrl({ target, logger }: { target: string; logger: Logger }) {
  try {
    logger.debug(`Checking Kibana URL ${target} for a redirect`);

    const unredirectedResponse = await fetch(target, {
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
    });

    const discoveredKibanaUrl =
      unredirectedResponse.headers.get('location')?.replace('/spaces/enter', '') || target;

    const parsedTarget = parse(target);

    const parsedDiscoveredUrl = parse(discoveredKibanaUrl);

    const discoveredKibanaUrlWithAuth = format({
      ...parsedDiscoveredUrl,
      auth: parsedTarget.auth,
    });

    const redirectedResponse = await fetch(discoveredKibanaUrlWithAuth, {
      method: 'HEAD',
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithAuth}, got ${redirectedResponse.status}`
      );
    }

    logger.info(`Discovered kibana running at: ${discoveredKibanaUrlWithAuth}`);

    return discoveredKibanaUrlWithAuth.replace(/\/$/, '');
  } catch (error) {
    throw new Error(`Could not connect to Kibana: ` + error.message);
  }
}

export async function getServiceUrls({ logger, target, kibana }: RunOptions & { logger: Logger }) {
  if (!target) {
    // assume things are running locally
    kibana = kibana || 'http://localhost:5601';
    target = 'http://localhost:9200';
  }

  if (!target) {
    throw new Error('Could not determine an Elasticsearch target');
  }

  const parsedTarget = parse(target);

  let auth = parsedTarget.auth;

  if (!parsedTarget.auth) {
    auth = await discoverAuth(parsedTarget);
  }

  const formattedEsUrl = format({
    ...parsedTarget,
    auth,
  });

  const suspectedKibanaUrl = kibana || target.replace('.es', '.kb');

  const parsedKibanaUrl = parse(suspectedKibanaUrl);

  const kibanaUrlWithAuth = format({
    ...parsedKibanaUrl,
    auth,
  });

  const validatedKibanaUrl = await getKibanaUrl({ target: kibanaUrlWithAuth, logger });

  return {
    kibanaUrl: validatedKibanaUrl,
    esUrl: formattedEsUrl,
  };
}
