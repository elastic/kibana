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
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

import {
  fetchComposedSchema,
  fetchConnectorTypes,
  fetchStepDefinitionIds,
  fetchTriggerDefinitionIds,
  type KibanaConnection,
} from '../src/fetch';
import { transformToStrict, transformToTemplate } from '../src/template_transform';
import { extractStepTypes, extractTriggerTypes } from '../src/introspect';
import { checkCompleteness } from '../src/completeness';
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
// `kibanaVersion`, `buildHash`, and `channel` are omitted from the committed
// `index.json` and stamped at CDN publish time by `publish_schema.sh` (via `jq`),
// so the committed tree carries a single, channel-agnostic bundle.
const OUTPUT_DIR = Path.resolve(
  process.env.WORKFLOW_SCHEMA_OUTPUT_DIR ??
    Path.join(REPO_ROOT, 'src/platform/packages/private/kbn-workflow-step-schema-cli/generated')
);

// Poll the *non-latching* step-definitions route, not `/api/workflows/schema`.
// The schema route freezes the registered-step cache on the first 200 it returns;
// using it as the readiness probe is self-defeating — it fires the latch that
// `await isReady()` in WorkflowValidationService is meant to prevent.
// `/internal/workflows_extensions/step_definitions` reads the registry live and
// never touches the connector cache, so it is safe to poll repeatedly.
const STEP_DEFINITIONS_PATH = '/internal/workflows_extensions/step_definitions';

const authHeaders = {
  Authorization: `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`,
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'Kibana',
  'elastic-api-version': '2023-10-31',
};

/**
 * Poll the registered step-definitions route until the count stabilizes across
 * two consecutive readings, meaning all async step loaders have settled.
 *
 * Polling the non-latching `/internal/workflows_extensions/step_definitions`
 * route (rather than `/api/workflows/schema`) ensures the probe does not freeze
 * the module-level connector cache before `await isReady()` in
 * WorkflowValidationService can run.
 *
 * A 2-minute budget keeps the descriptive "Timed out …" message winning the race
 * against Jest's own timeout even on slow CI shards.
 */
async function waitForStepRegistry(
  log: ToolingLog,
  baseUrl: string,
  timeoutMs = 2 * 60 * 1000
): Promise<void> {
  const start = Date.now();
  const deadline = start + timeoutMs;
  let lastError = 'unknown error';
  let attempts = 0;
  let previousCount = -1;

  while (Date.now() < deadline) {
    attempts++;
    try {
      const response = await fetch(`${baseUrl}${STEP_DEFINITIONS_PATH}`, {
        headers: authHeaders,
      });
      if (response.ok) {
        const body = await response.json();
        const steps: unknown[] = Array.isArray(body?.steps) ? body.steps : [];
        const count = steps.length;
        if (count > 0 && count === previousCount) {
          log.debug(
            `Step registry stable at ${count} step(s) after ${attempts} attempt(s) (${
              Date.now() - start
            }ms)`
          );
          return;
        }
        log.warning(
          `Step registry not stable yet (attempt ${attempts}): ` +
            `prev=${previousCount} current=${count}`
        );
        previousCount = count;
      } else {
        lastError = `HTTP ${response.status} ${response.statusText}`;
        log.warning(`Step definitions route not ready yet (attempt ${attempts}): ${lastError}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        const cause = (error as NodeJS.ErrnoException).cause;
        const causeStr = cause instanceof Error ? ` (cause: ${cause.message})` : '';
        lastError = `${error.message}${causeStr}`;
      } else {
        lastError = String(error);
      }
      log.warning(`Step definitions route not ready yet (attempt ${attempts}): ${lastError}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `Timed out waiting for ${STEP_DEFINITIONS_PATH} to stabilize after ${attempts} attempt(s) ` +
      `(${Date.now() - start}ms): ${lastError}`
  );
}

describe('workflow step schema generation', () => {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let baseUrl: string;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: {
        es: { license: 'trial' },
        kbn: {
          // `oss: false` discovers every repo plugin (getPackages(REPO_ROOT)), so
          // the full union of solution steps/connectors/triggers is registered.
          cliArgs: { oss: false },
          // An explicit port avoids a port-0 trap: createRootWithCorePlugins
          // defaults to server.port = 0 (OS-assigned ephemeral), but
          // coreSetup.http.getServerInfo() returns config.port (0), not the
          // actual bound port. fetch('http://localhost:0/...') fails immediately
          // with ECONNREFUSED for every attempt, silently timing the test out.
          server: { port: 55620 },
        },
      },
    });

    esServer = await startES();
    kibanaServer = await startKibana();

    const { protocol, hostname, port } = kibanaServer.coreSetup.http.getServerInfo();
    // Use 127.0.0.1 (IPv4) explicitly to avoid IPv6/IPv4 ambiguity where `localhost`
    // may resolve to `::1` on macOS while Kibana binds to `0.0.0.0` (IPv4 only).
    const host = hostname === '0.0.0.0' ? '127.0.0.1' : hostname;
    baseUrl = `${protocol}://${host}:${port}`;

    await waitForStepRegistry(log, baseUrl);
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

    const composedSchema = await fetchComposedSchema(connection, log);
    const connectorTypes = await fetchConnectorTypes(connection, log);
    const stepTypes = extractStepTypes(composedSchema);
    const triggerTypes = extractTriggerTypes(composedSchema);

    // Completeness gate: every step/trigger the same Kibana reports as registered
    // must appear in the schema it produced. This is the `--fail-on-incomplete`
    // semantics from the CLI, acting as a regression guard for the readiness fix
    // in WorkflowValidationService.getWorkflowZodSchema.
    const endpointStepIds = await fetchStepDefinitionIds(connection, log);
    const endpointTriggerIds = await fetchTriggerDefinitionIds(connection, log);
    const completeness = checkCompleteness({
      endpointStepIds,
      endpointTriggerIds,
      schemaStepTypes: stepTypes,
      schemaTriggerTypes: triggerTypes,
    });

    if (!completeness.complete) {
      const lines: string[] = ['Schema is missing registered definitions.'];
      if (completeness.missingSteps.length > 0) {
        lines.push(`  Missing steps: ${completeness.missingSteps.join(', ')}`);
      }
      if (completeness.missingTriggers.length > 0) {
        lines.push(`  Missing triggers: ${completeness.missingTriggers.join(', ')}`);
      }
      throw new Error(lines.join('\n'));
    }

    // A single channel-agnostic bundle. `kibanaVersion`, `buildHash`, and
    // `channel` are stamped at CDN publish time by `publish_schema.sh` so the
    // committed tree is not duplicated for release vs serverless.
    //
    // Guard OUTPUT_DIR against escaping the repo before deleting, so a
    // misconfigured WORKFLOW_SCHEMA_OUTPUT_DIR cannot wipe unrelated directories.
    if (!OUTPUT_DIR.startsWith(REPO_ROOT)) {
      throw new Error(
        `OUTPUT_DIR (${OUTPUT_DIR}) must be inside REPO_ROOT (${REPO_ROOT}). ` +
          'Check WORKFLOW_SCHEMA_OUTPUT_DIR.'
      );
    }
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
      profile: 'superset',
      connectorTypes,
      stepTypes,
      triggerTypes,
      variants: { strict, template },
    };
    writeIndex(bundleDir, manifest);

    log.success(`Wrote workflow step schema artifact to ${bundleDir}`);
  });
});
