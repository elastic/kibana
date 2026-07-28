/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { run as runWithCli } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_CHANNEL, DEFAULT_KIBANA_URL } from './constants';
import {
  fetchBuildInfo,
  fetchComposedSchema,
  fetchConnectorTypes,
  fetchStepDefinitionIds,
  fetchTriggerDefinitionIds,
  validateAuthFlags,
} from './fetch';
import type { KibanaConnection } from './fetch';
import { transformToStrict, transformToTemplate } from './template_transform';
import { extractStepTypes, extractTriggerTypes } from './introspect';
import { checkCompleteness } from './completeness';
import { writeIndex, writeVariant } from './write_artifact';
import type { IndexManifest } from './types';

const DEFAULT_OUTPUT_DIR = Path.resolve(REPO_ROOT, 'target/workflow_step_schemas');

type FlagValue = string | boolean | string[] | undefined;

const asOptionalString = (value: FlagValue): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export function run() {
  runCli().catch((error) => {
    // `run` already reports thrown errors; this guard is only for safety.
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}

const runCli = () =>
  runWithCli(
    async ({ log, flags }) => {
      const kibanaUrl = String(flags['kibana-url'] || DEFAULT_KIBANA_URL);
      const space = asOptionalString(flags.space);
      const username = asOptionalString(flags.username);
      const password = asOptionalString(flags.password);
      const apiKey = asOptionalString(flags['api-key']);
      const outputDir = Path.resolve(String(flags['output-dir'] || DEFAULT_OUTPUT_DIR));
      const channel = String(flags.channel || DEFAULT_CHANNEL);

      validateAuthFlags({ apiKey, username, password });

      const connection: KibanaConnection = { kibanaUrl, space, username, password, apiKey };

      const buildInfo = await fetchBuildInfo(connection, log);
      const kibanaVersion = asOptionalString(flags['kibana-version']) ?? buildInfo.version;
      const buildHash = asOptionalString(flags['build-hash']) ?? buildInfo.buildHash;

      const composedSchema = await fetchComposedSchema(connection, log);
      const connectorTypes = await fetchConnectorTypes(connection, log);
      // These throw (rather than emit an empty list) if the schema shape is unrecognized.
      const stepTypes = extractStepTypes(composedSchema);
      const triggerTypes = extractTriggerTypes(composedSchema);

      log.info(
        `Discovered ${connectorTypes.length} connector type(s), ` +
          `${stepTypes.length} step type(s), ${triggerTypes.length} trigger type(s).`
      );
      if (flags['list-types']) {
        logTypeList(log, 'Connector types', connectorTypes);
        logTypeList(log, 'Step types', stepTypes);
        logTypeList(log, 'Trigger types', triggerTypes);
      }

      const bundleDir = Path.join(outputDir, kibanaVersion, channel);

      const strictManifest = writeVariant({
        bundleDir,
        variant: 'strict',
        doc: transformToStrict(composedSchema),
      });
      const templateManifest = writeVariant({
        bundleDir,
        variant: 'template',
        doc: transformToTemplate(composedSchema),
      });

      const manifest: IndexManifest = {
        kibanaVersion,
        buildHash,
        profile: 'superset',
        channel,
        connectorTypes,
        stepTypes,
        triggerTypes,
        variants: {
          strict: strictManifest,
          template: templateManifest,
        },
      };

      const indexPath = writeIndex(bundleDir, manifest);

      log.success(`Wrote workflow step schema artifact to ${bundleDir}`);
      log.info(`Index: ${indexPath}`);

      if (!flags['skip-completeness-check']) {
        await runCompletenessGate({
          connection,
          log,
          stepTypes,
          triggerTypes,
          failOnIncomplete: Boolean(flags['fail-on-incomplete']),
        });
      }
    },
    {
      description:
        'Generate the superset workflow step JSON Schema artifact (strict + template variants) ' +
        'from a running Kibana. Point --kibana-url at a stateful, all-solutions, enterprise-license ' +
        'deployment with step feature flags on so the union of steps/connectors/triggers is complete.',
      flags: {
        string: [
          'kibana-url',
          'space',
          'username',
          'password',
          'api-key',
          'output-dir',
          'channel',
          'kibana-version',
          'build-hash',
        ],
        boolean: ['list-types', 'skip-completeness-check', 'fail-on-incomplete'],
        help: `
        --kibana-url <url>              Kibana base URL (default: ${DEFAULT_KIBANA_URL})
        --space <id>                   Kibana space id (default: default)
        --username <user>              Basic auth username (with --password)
        --password <pass>              Basic auth password (with --username)
        --api-key <key>                API key (base64 "id:key"); alternative to --username/--password
        --output-dir <dir>             Output directory (default: <repo>/target/workflow_step_schemas)
        --channel <name>               Artifact channel: release | serverless (default: ${DEFAULT_CHANNEL})
        --kibana-version <version>     Override version (default: from /api/status)
        --build-hash <hash>            Override build hash (default: from /api/status)
        --list-types                   Log the full sorted connector/step/trigger type lists
        --skip-completeness-check      Skip the endpoint-vs-schema completeness gate
        --fail-on-incomplete           Exit non-zero when a registered step/trigger is missing from the schema
      `,
      },
    }
  );

const logTypeList = (log: ToolingLog, label: string, ids: string[]): void => {
  log.info(`--- ${label} (${ids.length}) ---`);
  for (const id of ids) {
    log.info(`  ${id}`);
  }
};

/**
 * Self-consistency gate: fetch the ids the *same* Kibana reports as registered
 * and assert every one is present in the produced schema (`endpoint ⊆ schema`).
 * Warns by default; `--fail-on-incomplete` makes a gap fatal (for canonical
 * generation CI). The definition endpoints do not `await` the async step loader,
 * so a transient gap is possible - hence warn is the default.
 */
const runCompletenessGate = async ({
  connection,
  log,
  stepTypes,
  triggerTypes,
  failOnIncomplete,
}: {
  connection: KibanaConnection;
  log: ToolingLog;
  stepTypes: string[];
  triggerTypes: string[];
  failOnIncomplete: boolean;
}): Promise<void> => {
  let endpointStepIds: string[];
  let endpointTriggerIds: string[];
  try {
    endpointStepIds = await fetchStepDefinitionIds(connection, log);
    endpointTriggerIds = await fetchTriggerDefinitionIds(connection, log);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(`Skipping completeness gate - could not read definition endpoints: ${message}`);
    return;
  }

  const result = checkCompleteness({
    endpointStepIds,
    endpointTriggerIds,
    schemaStepTypes: stepTypes,
    schemaTriggerTypes: triggerTypes,
  });

  log.info('--- Completeness gate (registered definitions ⊆ produced schema) ---');
  log.info(`  registered: ${endpointStepIds.length} step(s), ${endpointTriggerIds.length} trigger(s)`);

  if (result.complete) {
    log.info('  all registered step/trigger definitions are present in the schema ✓');
    return;
  }

  if (result.missingSteps.length > 0) {
    log.warning(
      `  ${result.missingSteps.length} registered step(s) MISSING from the schema: ${result.missingSteps.join(
        ', '
      )}`
    );
  }
  if (result.missingTriggers.length > 0) {
    log.warning(
      `  ${
        result.missingTriggers.length
      } registered trigger(s) MISSING from the schema: ${result.missingTriggers.join(', ')}`
    );
  }

  if (failOnIncomplete) {
    throw createFlagError(
      'Completeness gate failed: registered step/trigger definitions are missing from the produced ' +
        'schema (see the report above). Re-run without --fail-on-incomplete to downgrade to a warning.'
    );
  }
};
