/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import type { ScoutServerConfig } from '../../../types';

/**
 * Transforms a Scout server config to enable HTTP/2 with TLS.
 * Mutates `kbnTestServer.serverArgs` and `esTestCluster.serverArgs` in-place
 * and returns the modified config.
 */
export const configureHTTP2 = (config: ScoutServerConfig): ScoutServerConfig => {
  process.env.IS_FTR_RUNNER = 'true';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const kibanaHostname = config.servers.kibana.hostname ?? 'localhost';
  const kibanaPort = config.servers.kibana.port;
  const certificateAuthorities = [readFileSync(CA_CERT_PATH, 'utf-8')];

  config.servers.kibana = {
    ...config.servers.kibana,
    protocol: 'https',
    certificateAuthorities,
  };

  const { serverArgs } = config.kbnTestServer;

  addOrReplaceArg(serverArgs, 'server.protocol', () => 'http2');
  addOrReplaceArg(serverArgs, 'server.ssl.enabled', () => 'true');
  addOrReplaceArg(serverArgs, 'server.ssl.key', () => KBN_KEY_PATH);
  addOrReplaceArg(serverArgs, 'server.ssl.certificate', () => KBN_CERT_PATH);
  addOrReplaceArg(serverArgs, 'server.ssl.certificateAuthorities', () => CA_CERT_PATH);

  rewriteKibanaUrlsToHttps(serverArgs, kibanaHostname, kibanaPort);

  // ES SAML realm args (sp.entity_id, sp.acs, sp.logout) also reference the Kibana URL
  rewriteKibanaUrlsToHttps(config.esTestCluster.serverArgs, kibanaHostname, kibanaPort);

  return config;
};

/**
 * Rewrites serverArg values that reference the Kibana host:port over http:// to https://.
 * Only rewrites URLs matching the Kibana hostname:port to avoid rewriting
 * Elasticsearch or other service URLs.
 */
const rewriteKibanaUrlsToHttps = (
  serverArgs: string[],
  hostname: string,
  port: number | undefined
) => {
  const httpKibanaUrl = port ? `http://${hostname}:${port}` : `http://${hostname}`;
  const httpsKibanaUrl = httpKibanaUrl.replace('http://', 'https://');

  for (let i = 0; i < serverArgs.length; i++) {
    if (serverArgs[i].includes(httpKibanaUrl)) {
      serverArgs[i] = serverArgs[i].replaceAll(httpKibanaUrl, httpsKibanaUrl);
    }
  }
};

const addOrReplaceArg = (
  serverArgs: string[],
  argName: string,
  replacer: (value: string | undefined) => string | undefined
) => {
  const argPrefix = `--${argName}=`;
  const argIndex = serverArgs.findIndex((value) => value.startsWith(argPrefix));

  if (argIndex === -1) {
    const newArgValue = replacer(undefined);
    if (newArgValue !== undefined) {
      serverArgs.push(`${argPrefix}${newArgValue}`);
    }
  } else {
    const currentArgValue = serverArgs[argIndex].substring(argPrefix.length);
    const newArgValue = replacer(currentArgValue);
    if (newArgValue !== undefined) {
      serverArgs[argIndex] = `${argPrefix}${newArgValue}`;
    } else {
      serverArgs.splice(argIndex, 1);
    }
  }
};
