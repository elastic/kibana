/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import type { ContractCall, OpenApiDocument } from '@kbn/connector-contract-mock';
import {
  createCertificateAuthority,
  createContractMockFetch,
  createContractMockProxy,
} from '@kbn/connector-contract-mock';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { findConnector } from '../src/test/vendor_api/find_connector';
import { loadVendorSpecs, readOptional } from '../src/test/vendor_api/load_vendor_specs';

const DEFAULT_PORT = 5690;
const DEFAULT_CA_DIRECTORY = path.join(REPO_ROOT, 'data', 'connector_contract_mock');

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.text();
};

/** Loads the CA from `directory`, creating it on first use, so Kibana's trust survives restarts. */
const loadCertificateAuthority = async (directory: string) => {
  const certFile = path.join(directory, 'ca.crt');
  const keyFile = path.join(directory, 'ca.key');
  const [cert, key] = await Promise.all([readOptional(certFile), readOptional(keyFile)]);
  if (cert !== undefined && key !== undefined) {
    return { certificateAuthority: createCertificateAuthority({ cert, key }), certFile };
  }
  const certificateAuthority = createCertificateAuthority();
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(certFile, certificateAuthority.cert);
  await fs.writeFile(keyFile, certificateAuthority.key, { mode: 0o600 });
  return { certificateAuthority, certFile };
};

// Server URLs with variables, such as https://{subdomain}.zendesk.com, depend on connector config.
const fixedHttpsOrigins = (specs: Readonly<Record<string, OpenApiDocument>>): string[] => {
  const origins = new Set<string>();
  for (const { servers } of Object.values(specs)) {
    for (const server of Array.isArray(servers) ? servers : []) {
      const url = typeof server?.url === 'string' ? server.url : '';
      if (url.startsWith('https://') && !url.includes('{')) {
        origins.add(new URL(url).origin);
      }
    }
  }
  return [...origins].sort();
};

const kibanaSettings = (proxyUrl: URL, certFile: string, origins: readonly string[]): string =>
  [
    `xpack.actions.proxyUrl: ${proxyUrl.href.replace(/\/$/, '')}`,
    ...(origins.length === 0
      ? []
      : [
          'xpack.actions.customHostSettings:',
          ...origins.flatMap((url) => [
            `  - url: ${url}`,
            `    ssl.certificateAuthoritiesFiles: ${certFile}`,
          ]),
        ]),
  ].join('\n');

const logCall = (
  log: ToolingLog,
  { request, operation, status, requestViolations, responseViolations }: ContractCall
) => {
  const line = `${status} ${request}${operation ? ` (${operation})` : ''}`;
  const violations = [...requestViolations, ...responseViolations];
  if (status >= 400 || violations.length > 0) {
    log.warning([line, ...violations.map(({ message }) => `  - ${message}`)].join('\n'));
  } else {
    log.info(line);
  }
};

run(
  async ({ log, flagsReader }) => {
    const id = flagsReader.requiredString('connector');
    const spec = flagsReader.enum('spec', ['snapshot', 'latest']) ?? 'snapshot';
    const port = flagsReader.number('port') ?? DEFAULT_PORT;
    const host = flagsReader.string('host') ?? '127.0.0.1';
    const caDirectory = flagsReader.path('ca-dir') ?? DEFAULT_CA_DIRECTORY;
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw createFlagError(`--port must be a port number, got ${port}`);
    }

    const { connector, directory } = await findConnector(id);
    if (!existsSync(path.join(directory, 'manifest.json'))) {
      throw createFlagError(
        `${id} has no vendor_api/manifest.json; record it with node scripts/connector_vendor_api`
      );
    }
    const { specs, pagination } = await loadVendorSpecs({
      directory,
      latest: spec === 'latest',
      fetchText,
      log,
    });
    const mock = createContractMockFetch({ specs, pagination });
    let logged = 0;
    const answer: typeof fetch = async (input, init) => {
      const response = await mock.fetch(input, init);
      for (; logged < mock.calls.length; logged++) {
        logCall(log, mock.calls[logged]);
      }
      return response;
    };

    const { certificateAuthority, certFile } = await loadCertificateAuthority(caDirectory);
    const proxy = createContractMockProxy({ fetch: answer, certificateAuthority });
    const proxyUrl = await proxy.listen(port, host);

    log.success(
      `Contract mock of ${connector.metadata.id} (${spec} specs: ${Object.keys(specs).join(
        ', '
      )}) is listening at ${proxyUrl.href}`
    );
    log.info(
      `Start Kibana with these settings in config/kibana.dev.yml:\n\n${kibanaSettings(
        proxyUrl,
        certFile,
        fixedHttpsOrigins(specs)
      )}\n\nFor vendor hosts that come from connector config, start Kibana with NODE_EXTRA_CA_CERTS=${certFile} instead of the customHostSettings.`
    );
    // Serves until interrupted; the runner's exit hook ends the process.
    await new Promise<never>(() => {});
  },
  {
    description: `Serves a connector's contract mock as an HTTP forward proxy, so a running Kibana can execute the connector against it.

      Requests are answered from the vendor specs in the connector's vendor_api folder, with the overlay applied, and HTTPS
      is intercepted with certificates from a local CA that Kibana must trust.`,
    flags: {
      string: ['connector', 'spec', 'port', 'host', 'ca-dir'],
      help: `
        --connector  Connector metadata.id, for example datadog or .datadog (required)
        --spec       snapshot (default) for the committed snapshots, or latest to fetch each source's current spec
        --port       Port to listen on (default ${DEFAULT_PORT})
        --host       Address to listen on (default 127.0.0.1)
        --ca-dir     Where the CA's ca.crt and ca.key are kept, created on first use (default data/connector_contract_mock)
      `,
    },
  }
);
