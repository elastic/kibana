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
import type { ContractCall, Emulator, OpenApiDocument } from '@kbn/connector-emulate';
import {
  combineEmulators,
  CONTROL_PATH,
  createCertificateAuthority,
  createEmulatorControlHandler,
  createEmulatorFetch,
  createEmulatorProxy,
  emulatorCredential,
} from '@kbn/connector-emulate';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { FoundConnector } from '../src/test/vendor_api/find_connector';
import { listConnectors } from '../src/test/vendor_api/find_connector';
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

// Hosts that several connectors call, whose requests need the connector's credential.
const sharedOrigins = (originsByConnector: ReadonlyMap<string, readonly string[]>) => {
  const connectorsByOrigin = new Map<string, string[]>();
  for (const [connector, origins] of originsByConnector) {
    for (const origin of origins) {
      connectorsByOrigin.set(origin, [...(connectorsByOrigin.get(origin) ?? []), connector]);
    }
  }
  return [...connectorsByOrigin].filter(([, connectors]) => connectors.length > 1);
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
  {
    request,
    operation,
    responseSource,
    status,
    requestViolations,
    responseViolations,
  }: ContractCall,
  prefix = ''
) => {
  const served = responseSource === 'fixture' || responseSource === 'recording';
  const line = `${prefix}${status} ${request}${operation ? ` (${operation})` : ''}${
    served ? ` [${responseSource}]` : ''
  }`;
  const violations = [...requestViolations, ...responseViolations];
  if (status >= 400 || violations.length > 0) {
    log.warning([line, ...violations.map(({ message }) => `  - ${message}`)].join('\n'));
  } else {
    log.info(line);
  }
};

/** The connector's `metadata.id` without the leading dot, as flags and credentials name it. */
const connectorName = ({ connector }: FoundConnector) => connector.metadata.id.replace(/^\./, '');

const hasManifest = ({ directory }: FoundConnector) =>
  existsSync(path.join(directory, 'manifest.json'));

const SCOPED_PATH = /^([a-z0-9][a-z0-9_-]*)=(.+)$/;

/**
 * Reads `--fixtures` or `--recordings` values: `<connector>=<path>`, or a plain path when one
 * connector is served.
 */
const pathsByConnector = (
  flag: string,
  values: readonly string[],
  connectors: readonly string[]
): Map<string, string> => {
  const paths = new Map<string, string>();
  for (const value of values) {
    const scoped = SCOPED_PATH.exec(value);
    if (scoped && connectors.includes(scoped[1])) {
      paths.set(scoped[1], path.resolve(scoped[2]));
    } else if (connectors.length === 1) {
      paths.set(connectors[0], path.resolve(value));
    } else {
      throw createFlagError(
        `--${flag} ${value}: name the connector, as <connector>=<path>, when serving several (${connectors.join(
          ', '
        )})`
      );
    }
  }
  return paths;
};

// Lists the connectors once, as each lookup imports every spec.
const findEach = async (ids: readonly string[]): Promise<FoundConnector[]> => {
  const listed = await listConnectors();
  return ids.map((id) => {
    const wanted = id.startsWith('.') ? id : `.${id}`;
    const match = listed.find(({ connector }) => connector.metadata.id === wanted);
    if (!match) {
      throw createFlagError(`No connector in all_specs.ts has metadata.id "${wanted}"`);
    }
    return match;
  });
};

const findConnectors = async (ids: readonly string[], all: boolean): Promise<FoundConnector[]> => {
  if (all === ids.length > 0) {
    throw createFlagError('pass either --connector or --all');
  }
  const found = all ? (await listConnectors()).filter(hasManifest) : await findEach(ids);
  const missing = found.filter((connector) => !hasManifest(connector));
  if (missing.length > 0) {
    throw createFlagError(
      `${missing
        .map(({ connector }) => connector.metadata.id)
        .join(
          ', '
        )} has no vendor_api/manifest.json; record it with node scripts/connector_vendor_api`
    );
  }
  return found;
};

run(
  async ({ log, flagsReader }) => {
    const ids = (flagsReader.arrayOfStrings('connector') ?? []).flatMap((value) =>
      value.split(',').filter(Boolean)
    );
    const all = flagsReader.boolean('all');
    const spec = flagsReader.enum('spec', ['snapshot', 'latest']) ?? 'snapshot';
    const port = flagsReader.number('port') ?? DEFAULT_PORT;
    const host = flagsReader.string('host') ?? '127.0.0.1';
    const caDirectory = flagsReader.path('ca-dir') ?? DEFAULT_CA_DIRECTORY;
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw createFlagError(`--port must be a port number, got ${port}`);
    }

    const found = await findConnectors(ids, all);
    const names = found.map(connectorName);
    const fixturesFiles = pathsByConnector(
      'fixtures',
      flagsReader.arrayOfStrings('fixtures') ?? [],
      names
    );
    const recordingsPaths = pathsByConnector(
      'recordings',
      flagsReader.arrayOfStrings('recordings') ?? [],
      names
    );
    const single = found.length === 1;

    const emulators: Record<string, Emulator> = {};
    const originsByConnector = new Map<string, string[]>();
    const sources: string[] = [];
    let fixtureCount = 0;
    let recordingCount = 0;
    for (const [index, { directory }] of found.entries()) {
      const name = names[index];
      const { specs, pagination } = await loadVendorSpecs({
        directory,
        latest: spec === 'latest',
        fetchText,
        log,
      });
      // Recordings given for this run come first, so they win over the committed ones.
      const runRecordings = recordingsPaths.get(name);
      const recordings = [
        ...(runRecordings ? await readRecordings(runRecordings) : []),
        ...(await readRecordings(path.join(directory, RECORDINGS), { optional: true })),
      ];
      const fixturesFile = fixturesFiles.get(name);
      const fixtures = fixturesFile ? await readResponseFixtures(fixturesFile) : [];
      emulators[name] = createEmulatorFetch({
        specs,
        pagination,
        fixtures,
        recordings,
        onCall: (call) => logCall(log, call, single ? '' : `[${name}] `),
      });
      originsByConnector.set(name, fixedHttpsOrigins(specs));
      const specNames = Object.keys(specs).join(', ');
      sources.push(single ? specNames : `${name} (${specNames})`);
      fixtureCount += fixtures.length;
      recordingCount += recordings.length;
    }
    const mock = combineEmulators(emulators);
    for (const { connector, source, operation, violations } of mock.rejectedResponses) {
      log.warning(
        [
          `Not serving the ${source} for ${
            single ? '' : `${connector} `
          }${operation} (paths are relative to the server URL; GET ${CONTROL_PATH}/operations lists them):`,
          ...violations.map(({ message }) => `  - ${message}`),
        ].join('\n')
      );
    }

    const { certificateAuthority, certFile } = await loadCertificateAuthority(caDirectory);
    const proxy = createEmulatorProxy({
      fetch: mock.fetch,
      certificateAuthority,
      control: createEmulatorControlHandler(mock),
    });
    const proxyUrl = await proxy.listen(port, host);
    const controlUrl = (endpoint: string) => new URL(`${CONTROL_PATH}/${endpoint}`, proxyUrl).href;

    log.success(
      `Contract mock of ${
        single ? found[0].connector.metadata.id : `${found.length} connectors`
      } (${spec} specs: ${sources.join(', ')}) is listening at ${
        proxyUrl.href
      }, with ${fixtureCount} fixtures and ${recordingCount} recordings loaded${
        mock.rejectedResponses.length > 0
          ? ` (${mock.rejectedResponses.length} not served, listed above)`
          : ''
      }`
    );
    log.info(
      `Control endpoints: GET ${controlUrl('calls')}, POST ${controlUrl('reset')}, GET ${controlUrl(
        'operations'
      )}${single ? '' : '; add ?connector=<id> to scope them to one connector'}`
    );
    log.info('Start Kibana with these settings in config/kibana.dev.yml:');
    const origins = [...new Set([...originsByConnector.values()].flat())].sort();
    // Written without the log prefix, which indents every line after the first, so the YAML
    // can be pasted as printed.
    log.write(`\n${kibanaSettings(proxyUrl, certFile, origins)}\n`);
    log.info(
      `For vendor hosts that come from connector config, start Kibana with NODE_EXTRA_CA_CERTS=${certFile} instead of the customHostSettings; it trusts the CA for every host. If config/kibana.dev.yml already sets xpack.actions.customHostSettings, add these entries to that list.`
    );
    if (!single) {
      const shared = sharedOrigins(originsByConnector);
      log.info(
        [
          `Requests go to the connector whose credential they carry, such as ${emulatorCredential(
            names[0]
          )} as an API key, token, Basic auth user or password, or OAuth client ID; other requests go to the first connector whose specs match the URL.`,
          ...(shared.length === 0
            ? []
            : [
                'These hosts are called by several connectors, whose requests need the credential to get their own responses:',
                ...shared.map(([origin, connectors]) => `  - ${origin}: ${connectors.join(', ')}`),
              ]),
        ].join('\n')
      );
    }
    // Serves until interrupted; the runner's exit hook ends the process.
    await new Promise<never>(() => {});
  },
  {
    description: `Serves the contract mocks of one or more connectors as an HTTP forward proxy, so a running Kibana can execute the connectors against them.

      Requests are answered from the vendor specs in the connector's vendor_api folder, with the overlay applied, and HTTPS
      is intercepted with certificates from a local CA that Kibana must trust. Fixtures, then recordings, are served ahead
      of the spec's examples and samples. Tests read and reset the calls through the control endpoints under ${CONTROL_PATH}.

      Several connectors are served by one proxy, each from its own specs, overlay, fixtures and recordings. A request goes
      to the connector whose credential (emulate-<id>, e.g. emulate-outlook) it carries, otherwise to the first connector
      whose specs match the URL.`,
    flags: {
      string: ['connector', 'spec', 'port', 'host', 'ca-dir', 'fixtures', 'recordings'],
      boolean: ['all'],
      help: `
        --connector   Connector metadata.id, for example datadog or .datadog; repeat it or separate ids with commas
                      to serve several connectors
        --all         Serve every connector with a vendor_api/manifest.json
        --spec        snapshot (default) for the committed snapshots, or latest to fetch each source's current spec
        --port        Port to listen on (default ${DEFAULT_PORT})
        --host        Address to listen on (default 127.0.0.1)
        --ca-dir      Where the CA's ca.crt and ca.key are kept, created on first use (default data/connector_emulate)
        --fixtures    JSON file of responses to serve for this run, as a list of { method, path, status, headers, body, source },
                      the format of the per-action responses in fixtures.json. With several connectors, name the connector
                      as <connector>=<file>, and repeat the flag per connector
        --recordings  JSON file, or folder of them, of recordings ({ exchanges: [{ operation, request, response }] }) to serve
                      for this run, ahead of the connector's committed vendor_api/recordings. With several connectors, name
                      the connector as <connector>=<path>
      `,
    },
  }
);
