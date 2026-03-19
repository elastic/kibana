/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Agent as HttpAgent } from 'http';
import type { AgentOptions } from 'https';
import { Agent as HttpsAgent } from 'https';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Logger } from '@kbn/logging';
import { getNodeSSLOptions, getSSLSettingsFromConfig } from './get_node_ssl_options';
import type { CustomHostSettings, ProxySettings, SSLSettings } from './types';

/**
 * Create http and https proxy agents with custom proxy /hosts/SSL settings from configurationUtilities
 */
interface GetCustomAgentsResponse {
  httpAgent: HttpAgent | undefined;
  httpsAgent: HttpsAgent | undefined;
}

interface GetCustomAgentsOpts {
  customHostSettings?: CustomHostSettings;
  logger: Logger;
  proxySettings?: ProxySettings;
  sslOverrides?: SSLSettings;
  sslSettings: SSLSettings;
  url: string;
}

export function getCustomAgents(opts: GetCustomAgentsOpts): GetCustomAgentsResponse {
  const {
    customHostSettings,
    logger,
    proxySettings,
    sslOverrides,
    sslSettings: generalSSLSettings,
    url,
  } = opts;

  const agentSSLOptions = getNodeSSLOptions(
    logger,
    sslOverrides?.verificationMode ?? generalSSLSettings.verificationMode,
    sslOverrides
  );
  // the default for rejectUnauthorized is the global setting, which can
  // be overridden (below) with a custom host setting
  const defaultAgents = {
    httpAgent: undefined,
    httpsAgent: new HttpsAgent({
      ...agentSSLOptions,
    }),
  };

  // Get the current proxy settings, and custom host settings for this URL.
  // If there are neither of these, return the default agents
  if (!proxySettings && !customHostSettings) {
    return defaultAgents;
  }

  // update the defaultAgents.httpsAgent if configured
  const sslSettings = customHostSettings?.ssl;
  let agentOptions: AgentOptions | undefined;
  if (sslSettings) {
    logger.debug(`Creating customized connection settings for: ${url}`);
    agentOptions = defaultAgents.httpsAgent.options;

    if (sslSettings.certificateAuthoritiesData) {
      agentOptions.ca = sslSettings.certificateAuthoritiesData;
    }

    const sslSettingsFromConfig = getSSLSettingsFromConfig(sslSettings.verificationMode);
    // see: src/core/server/elasticsearch/legacy/elasticsearch_client_config.ts
    // This is where the global rejectUnauthorized is overridden by a custom host
    const customHostNodeSSLOptions = getNodeSSLOptions(
      logger,
      sslSettingsFromConfig.verificationMode,
      sslOverrides
    );
    if (customHostNodeSSLOptions.rejectUnauthorized !== undefined) {
      agentOptions.rejectUnauthorized = customHostNodeSSLOptions.rejectUnauthorized;
    }
  }

  // if there weren't any proxy settings, return the currently calculated agents
  if (!proxySettings) {
    return defaultAgents;
  }

  // there is a proxy in use, but it's possible we won't use it via custom host
  // proxyOnlyHosts and proxyBypassHosts
  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch (err) {
    logger.warn(`error determining proxy state for invalid url "${url}", using default agents`);
    return defaultAgents;
  }

  // filter out hostnames in the proxy bypass or only lists
  const { hostname } = targetUrl;

  if (proxySettings.proxyBypassHosts) {
    if (proxySettings.proxyBypassHosts.has(hostname)) {
      return defaultAgents;
    }
  }

  if (proxySettings.proxyOnlyHosts) {
    if (!proxySettings.proxyOnlyHosts.has(hostname)) {
      return defaultAgents;
    }
  }

  logger.debug(`Creating proxy agents for proxy: ${proxySettings.proxyUrl}`);
  let proxyUrl: URL;
  try {
    proxyUrl = new URL(proxySettings.proxyUrl);
  } catch (err) {
    logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored`);
    return defaultAgents;
  }

  const proxyNodeSSLOptions = getNodeSSLOptions(
    logger,
    proxySettings.proxySSLSettings.verificationMode,
    sslOverrides
  );
  // At this point, we are going to use a proxy, so we need new agents.
  // We will though, copy over the calculated ssl options from above, into
  // the https agent.
  const httpAgent = new HttpProxyAgent(proxySettings.proxyUrl) as unknown as HttpAgent;
  const httpsAgent = new HttpsProxyAgent({
    host: proxyUrl.hostname,
    port: Number(proxyUrl.port),
    protocol: proxyUrl.protocol,
    headers: proxySettings.proxyHeaders,
    // do not fail on invalid certs if value is false
    ...proxyNodeSSLOptions,
  }) as unknown as HttpsAgent;
  // vsCode wasn't convinced HttpsProxyAgent is an https.Agent, so we convinced it

  if (agentOptions) {
    httpsAgent.options = {
      ...httpsAgent.options,
      ...agentOptions,
    };
  }

  return { httpAgent, httpsAgent };
}
