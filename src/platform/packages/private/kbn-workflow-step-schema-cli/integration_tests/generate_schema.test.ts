/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

import {
  fetchBuildInfo,
  fetchComposedSchema,
  fetchConnectorTypes,
  type KibanaConnection,
} from '../src/fetch';
import { transformToStrict, transformToTemplate } from '../src/template_transform';
import { extractStepTypes, extractTriggerTypes } from '../src/introspect';
import { writeVariant, writeIndex } from '../src/write_artifact';
import type { IndexManifest } from '../src/types';

// Superuser of the test ES cluster (see `@kbn/test` `adminTestUser`).
const USERNAME = 'elastic';
const PASSWORD = 'changeme';

// This test is a generation task, not an assertion of fixed output: it (re)writes
// the committed artifact directly, and CI auto-commits any drift. The committed
// tree is the source of truth published to the CDN, so it must live outside the
// gitignored `target/`. An override is honored for local experimentation.
//
// A single channel-agnostic bundle is committed here. The `channel` field is
// omitted from the committed `index.json` and stamped at CDN publish time by
// `publish_schema.sh` (which uses `jq` to add `.channel` for release vs
// serverless paths).
const OUTPUT_DIR = Path.resolve(
  process.env.WORKFLOW_SCHEMA_OUTPUT_DIR ??
    Path.join(REPO_ROOT, 'src/platform/packages/private/kbn-workflow-step-schema-cli/generated')
);

const SCHEMA_READY_PATH = '/api/workflows/schema?loose=false';

const authHeaders = {
  Authorization: `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`,
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'Kibana',
  'elastic-api-version': '2023-10-31',
};

/**
 * Poll the composed-schema route until the workflows plugins have finished
 * registering, so the generated artifact reflects the full superset rather than
 * a partially-initialized registry.
 */
async function waitForSchemaRoute(baseUrl: string, timeoutMs = 5 * 60 * 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'unknown error';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}${SCHEMA_READY_PATH}`, { headers: authHeaders });
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Timed out waiting for ${SCHEMA_READY_PATH}: ${lastError}`);
}

describe('workflow step schema generation', () => {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let baseUrl: string;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: {
        es: {
          license: 'trial',
        },
      },
    });

    esServer = await startES();

    // `oss: false` discovers every repo plugin (`getPackages(REPO_ROOT)`), so the
    // full union of solution steps/connectors/triggers is registered.
    const root = createRootWithCorePlugins({}, { oss: false });
    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();
    kibanaServer = { root, coreSetup, coreStart, stop: async () => await root.shutdown() };

    const { protocol, hostname, port } = coreSetup.http.getServerInfo();
    const host = hostname === '0.0.0.0' ? 'localhost' : hostname;
    baseUrl = `${protocol}://${host}:${port}`;

    await waitForSchemaRoute(baseUrl);
  });

  afterAll(async () => {
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('writes the workflow step schema artifact from a live Kibana', async () => {
    const connection: KibanaConnection = {
      kibanaUrl: baseUrl,
      username: USERNAME,
      password: PASSWORD,
    };

    // Mirrors the CLI orchestration (`scripts/generate_workflow_step_schemas.js`)
    // so the committed bytes match what operators produce.
    const { version, buildHash } = await fetchBuildInfo(connection, log);
    const composedSchema = await fetchComposedSchema(connection, log);
    const connectorTypes = await fetchConnectorTypes(connection, log);
    const stepTypes = extractStepTypes(composedSchema);
    const triggerTypes = extractTriggerTypes(composedSchema);

    // Guard against a thin/partial boot silently shrinking the committed schema.
    expect(stepTypes.length).toBeGreaterThan(0);
    expect(connectorTypes.length).toBeGreaterThan(0);

    // A single channel-agnostic bundle. The `channel` field is stamped at CDN
    // publish time by `publish_schema.sh` so the committed tree is not
    // duplicated for release vs serverless.
    const bundleDir = OUTPUT_DIR;
    Fs.rmSync(bundleDir, { recursive: true, force: true });

    const strict = writeVariant({
      bundleDir,
      variant: 'strict',
      doc: transformToStrict(composedSchema),
    });
    const template = writeVariant({
      bundleDir,
      variant: 'template',
      doc: transformToTemplate(composedSchema),
    });

    const manifest: IndexManifest = {
      kibanaVersion: version,
      buildHash,
      profile: 'superset',
      connectorTypes,
      stepTypes,
      triggerTypes,
      variants: { strict, template },
    };
    writeIndex(bundleDir, manifest);

    log.success(`Wrote workflow step schema artifact to ${bundleDir}`);

    expect(Fs.existsSync(Path.join(bundleDir, 'index.json'))).toBe(true);
    expect(Fs.existsSync(Path.join(bundleDir, 'strict', 'schema.json'))).toBe(true);
    expect(Fs.existsSync(Path.join(bundleDir, 'template', 'schema.json'))).toBe(true);
  });
});
