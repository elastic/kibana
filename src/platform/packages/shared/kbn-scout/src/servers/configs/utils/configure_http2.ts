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
 *
 * Aligned with FTR's `configureHTTP2` in `src/platform/test/common/configure_http2.ts`.
 */
export const configureHTTP2 = (config: ScoutServerConfig): ScoutServerConfig => {
  // Kibana exits on NODE_TLS_REJECT_UNAUTHORIZED warning unless IS_FTR_RUNNER is set
  // (see src/setup_node_env/exit_on_warning.js)
  process.env.IS_FTR_RUNNER = 'true';
  // Required for libraries like supertest that have no API to accept self-signed certs
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const kibanaHostname = config.servers.kibana.hostname ?? 'localhost';
  const kibanaPort = config.servers.kibana.port;
  const certificateAuthorities = [readFileSync(CA_CERT_PATH, 'utf-8')];

  // KbnClient and other test clients read protocol + certificateAuthorities from this config
  // to build HTTPS agents (see kbn_client_requester.ts)
  config.servers.kibana = {
    ...config.servers.kibana,
    protocol: 'https',
    certificateAuthorities,
  };

  const { serverArgs } = config.kbnTestServer;

  // Enable HTTP/2 protocol with TLS on the Kibana server process
  addOrReplaceArg(serverArgs, 'server.protocol', () => 'http2');
  addOrReplaceArg(serverArgs, 'server.ssl.enabled', () => 'true');
  addOrReplaceArg(serverArgs, 'server.ssl.key', () => KBN_KEY_PATH);
  addOrReplaceArg(serverArgs, 'server.ssl.certificate', () => KBN_CERT_PATH);
  addOrReplaceArg(serverArgs, 'server.ssl.certificateAuthorities', () => CA_CERT_PATH);

  // Rewrite Kibana URL references (e.g. --server.publicBaseUrl, --newsfeed.service.urlRoot)
  // from http:// to https:// so they match the TLS-enabled server
  rewriteKibanaUrlsToHttps(serverArgs, kibanaHostname, kibanaPort);

  const esArgs = config.esTestCluster.serverArgs;

  // SAML realm SP args (sp.entity_id, sp.acs, sp.logout) embed the Kibana base URL;
  // they must use https:// to match the SAML assertions produced by the mock IDP
  rewriteKibanaUrlsToHttps(esArgs, kibanaHostname, kibanaPort);

  // ES SAML realm validates HTTPS SP URLs against a trusted CA — without this,
  // ES rejects the self-signed dev certificate (mirrors FTR's saml.http2.config.ts)
  addSamlRealmSslCa(esArgs);

  return config;
};

/**
 * Rewrites serverArg values that reference the Kibana host:port over http:// to https://.
 *
 * Used for both Kibana and ES args. For Kibana, this covers args like `server.publicBaseUrl`
 * and `newsfeed.service.urlRoot`. For ES, this covers SAML SP args (`sp.entity_id`, `sp.acs`,
 * `sp.logout`) that must match the actual Kibana protocol.
 *
 * Only rewrites URLs matching the exact Kibana hostname:port to avoid accidentally
 * rewriting Elasticsearch or other service URLs.
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

/**
 * Detects SAML realm names from ES serverArgs and adds `ssl.certificate_authorities`
 * so ES trusts Kibana's dev TLS certificate for HTTPS SP URLs.
 *
 * Without this, ES cannot validate the SAML SP endpoints (entity_id, acs, logout)
 * when they use https:// with the dev self-signed certificate.
 * Mirrors FTR's explicit `ssl.certificate_authorities` in saml.http2.config.ts.
 */
const addSamlRealmSslCa = (esArgs: string[]) => {
  const realmNames = new Set<string>();
  const realmPattern = /^xpack\.security\.authc\.realms\.saml\.([^.=]+)\./;

  for (const arg of esArgs) {
    const match = arg.match(realmPattern);
    if (match) {
      realmNames.add(match[1]);
    }
  }

  for (const realmName of realmNames) {
    const sslCaArg = `xpack.security.authc.realms.saml.${realmName}.ssl.certificate_authorities=${CA_CERT_PATH}`;
    if (!esArgs.includes(sslCaArg)) {
      esArgs.push(sslCaArg);
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
