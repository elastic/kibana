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
import type { ContractCall, McpControlRequest, OpenApiDocument } from '@kbn/connector-emulate';
import {
  CONTROL_PATH,
  createCertificateAuthority,
  createEmulatorControlHandler,
  createEmulatorFetch,
  createEmulatorProxy,
} from '@kbn/connector-emulate';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { findConnector } from '../src/test/vendor_api/find_connector';
import {
  readRecordings,
  readResponseFixtures,
  RECORDINGS,
} from '../src/test/vendor_api/load_responses';
import { loadVendorSpecs, readOptional } from '../src/test/vendor_api/load_vendor_specs';

const DEFAULT_PORT = 5690;
const DEFAULT_CA_DIRECTORY = path.join(REPO_ROOT, 'data', 'connector_emulate');

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

const MAX_LOGGED_ARGUMENTS = 300;

const logMcpRequest = (log: ToolingLog, request: McpControlRequest) => {
  if (!('tool' in request)) {
    log.info(
      `[mcp] ${
        request.method === 'initialize'
          ? `${request.client ?? 'a client'} connected`
          : request.method
      }`
    );
    return;
  }
  const args = JSON.stringify(request.arguments);
  const line = `[mcp] ${request.tool} ${
    args.length > MAX_LOGGED_ARGUMENTS ? `${args.slice(0, MAX_LOGGED_ARGUMENTS)}…` : args
  } → ${request.summary}`;
  if (request.isError) {
    log.warning(line);
  } else {
    log.info(line);
  }
};

const logCall = (
  log: ToolingLog,
  {
    request,
    operation,
    responseSource,
    status,
    requestViolations,
    responseViolations,
  }: ContractCall
) => {
  const served =
    responseSource === 'fixture' ||
    responseSource === 'recording' ||
    responseSource === 'runtime-fixture';
  const line = `${status} ${request}${operation ? ` (${operation})` : ''}${
    served ? ` [${responseSource}]` : ''
  }`;
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
    const fixturesFile = flagsReader.path('fixtures');
    const recordingsPath = flagsReader.path('recordings');
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
    // Recordings given for this run come first, so they win over the committed ones.
    const recordings = [
      ...(recordingsPath ? await readRecordings(recordingsPath) : []),
      ...(await readRecordings(path.join(directory, RECORDINGS), { optional: true })),
    ];
    const fixtures = fixturesFile ? await readResponseFixtures(fixturesFile) : [];
    const mock = createEmulatorFetch({
      specs,
      pagination,
      fixtures,
      recordings,
      onCall: (call) => logCall(log, call),
    });
    for (const { source, operation, violations } of mock.rejectedResponses) {
      log.warning(
        [
          `Not serving the ${source} for ${operation} (paths are relative to the server URL; GET ${CONTROL_PATH}/operations lists them):`,
          ...violations.map(({ message }) => `  - ${message}`),
        ].join('\n')
      );
    }

    const { certificateAuthority, certFile } = await loadCertificateAuthority(caDirectory);
    const proxy = createEmulatorProxy({
      fetch: mock.fetch,
      certificateAuthority,
      control: createEmulatorControlHandler(mock, {
        onRequest: (request) => logMcpRequest(log, request),
      }),
    });
    const proxyUrl = await proxy.listen(port, host);
    const controlUrl = (endpoint: string) => new URL(`${CONTROL_PATH}/${endpoint}`, proxyUrl).href;

    log.success(
      `Contract mock of ${connector.metadata.id} (${spec} specs: ${Object.keys(specs).join(
        ', '
      )}) is listening at ${proxyUrl.href}, with ${fixtures.length} fixtures and ${
        recordings.length
      } recordings loaded${
        mock.rejectedResponses.length > 0
          ? ` (${mock.rejectedResponses.length} not served, listed above)`
          : ''
      }`
    );
    log.info(
      `Control endpoints: GET ${controlUrl('calls')}, POST ${controlUrl('reset')}, GET ${controlUrl(
        'operations'
      )}`
    );
    log.info(
      `MCP server for agents: ${controlUrl(
        'mcp'
      )} (claude mcp add --transport http emulator ${controlUrl('mcp')})`
    );
    log.info('Start Kibana with these settings in config/kibana.dev.yml:');
    // Written without the log prefix, which indents every line after the first, so the YAML
    // can be pasted as printed.
    log.write(`\n${kibanaSettings(proxyUrl, certFile, fixedHttpsOrigins(specs))}\n`);
    log.info(
      `For vendor hosts that come from connector config, start Kibana with NODE_EXTRA_CA_CERTS=${certFile} instead of the customHostSettings. If config/kibana.dev.yml already sets xpack.actions.customHostSettings, add these entries to that list.`
    );
    // Serves until interrupted; the runner's exit hook ends the process.
    await new Promise<never>(() => {});
  },
  {
    description: `Serves a connector's contract mock as an HTTP forward proxy, so a running Kibana can execute the connector against it.

      Requests are answered from the vendor specs in the connector's vendor_api folder, with the overlay applied, and HTTPS
      is intercepted with certificates from a local CA that Kibana must trust. Fixtures, then recordings, are served ahead
      of the spec's examples and samples. Tests read and reset the calls through the control endpoints under ${CONTROL_PATH}.`,
    flags: {
      string: ['connector', 'spec', 'port', 'host', 'ca-dir', 'fixtures', 'recordings'],
      help: `
        --connector   Connector metadata.id, for example datadog or .datadog (required)
        --spec        snapshot (default) for the committed snapshots, or latest to fetch each source's current spec
        --port        Port to listen on (default ${DEFAULT_PORT})
        --host        Address to listen on (default 127.0.0.1)
        --ca-dir      Where the CA's ca.crt and ca.key are kept, created on first use (default data/connector_emulate)
        --fixtures    JSON file of responses to serve for this run, as a list of { method, path, status, headers, body, source },
                      the format of the per-action responses in fixtures.json
        --recordings  JSON file, or folder of them, of recordings ({ exchanges: [{ operation, request, response }] }) to serve
                      for this run, ahead of the connector's committed vendor_api/recordings
      `,
    },
  }
);
