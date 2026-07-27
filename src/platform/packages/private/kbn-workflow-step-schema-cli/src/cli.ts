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
import {
  DEFAULT_CHANNEL,
  DEFAULT_CHUNK_THRESHOLD_BYTES,
  DEFAULT_KIBANA_URL,
} from './constants';
import { fetchBuildInfo, fetchComposedSchema, fetchConnectorTypes } from './fetch';
import type { KibanaConnection } from './fetch';
import { transformToStrict, transformToTemplate } from './template_transform';
import { extractStepTypes, extractTriggerTypes } from './introspect';
import {
  DEFAULT_FIXTURES_DIR,
  buildFixtureDeviationReport,
  loadApprovedDefinitions,
} from './fixtures';
import type { FixtureDeviationReport } from './fixtures';
import { writeIndex, writeVariant } from './write_artifact';
import type { IndexManifest, VariantManifest } from './types';

const DEFAULT_OUTPUT_DIR = Path.resolve(REPO_ROOT, 'target/workflow_step_schemas');

type FlagValue = string | boolean | string[] | undefined;

const asOptionalString = (value: FlagValue): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

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

      if (apiKey && (username || password)) {
        throw createFlagError('Provide either --api-key or --username/--password, not both.');
      }
      if (!apiKey && (Boolean(username) !== Boolean(password))) {
        throw createFlagError('Both --username and --password are required together.');
      }

      const thresholdFlag = asOptionalString(flags['chunk-threshold-bytes']);
      const chunkThresholdBytes = thresholdFlag
        ? Number.parseInt(thresholdFlag, 10)
        : DEFAULT_CHUNK_THRESHOLD_BYTES;
      if (!Number.isFinite(chunkThresholdBytes) || chunkThresholdBytes < 0) {
        throw createFlagError('--chunk-threshold-bytes must be a non-negative integer.');
      }

      const connection: KibanaConnection = { kibanaUrl, space, username, password, apiKey };

      const buildInfo = await fetchBuildInfo(connection, log);
      const kibanaVersion = asOptionalString(flags['kibana-version']) ?? buildInfo.version;
      const buildHash = asOptionalString(flags['build-hash']) ?? buildInfo.buildHash;

      const composedSchema = await fetchComposedSchema(connection, log);
      const connectorTypes = await fetchConnectorTypes(connection, log);
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

      const strictDoc = transformToStrict(composedSchema);
      const templateDoc = transformToTemplate(composedSchema);

      const strictManifest = writeVariant({
        bundleDir,
        variant: 'strict',
        doc: strictDoc,
        chunkThresholdBytes,
      });
      const templateManifest = writeVariant({
        bundleDir,
        variant: 'template',
        doc: templateDoc,
        chunkThresholdBytes,
      });

      const manifest: IndexManifest = {
        kibanaVersion,
        buildHash,
        profile: 'superset',
        channel,
        generatedAt: new Date().toISOString(),
        connectorTypes,
        stepTypes,
        triggerTypes,
        chunkThresholdBytes,
        variants: {
          strict: strictManifest,
          template: templateManifest,
        },
      };

      const indexPath = writeIndex(bundleDir, manifest);

      reportSizes(log, strictManifest, templateManifest, chunkThresholdBytes);
      log.success(`Wrote workflow step schema artifact to ${bundleDir}`);
      log.info(`Index: ${indexPath}`);

      if (!flags['skip-fixture-check']) {
        const fixturesDir = asOptionalString(flags['fixtures-dir']) ?? DEFAULT_FIXTURES_DIR;
        const hasDeviations = runFixtureCheck({
          log,
          fixturesDir,
          stepTypes,
          triggerTypes,
        });
        if (hasDeviations && flags['fail-on-fixture-deviation']) {
          throw createFlagError(
            'Fixture deviations detected (approved steps/triggers missing from the artifact). ' +
              'See the report above; re-run with --skip-fixture-check to ignore.'
          );
        }
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
          'chunk-threshold-bytes',
          'fixtures-dir',
        ],
        boolean: ['list-types', 'skip-fixture-check', 'fail-on-fixture-deviation'],
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
        --chunk-threshold-bytes <n>    Gzip size at/above which a variant is chunked
                                       (default: ${DEFAULT_CHUNK_THRESHOLD_BYTES})
        --list-types                   Log the full sorted connector/step/trigger type lists
        --skip-fixture-check           Skip comparing produced types against the approved fixtures
        --fixtures-dir <dir>           Override the approved-definitions fixtures directory
        --fail-on-fixture-deviation    Exit non-zero when approved steps/triggers are missing
      `,
      },
    }
  );

const reportSizes = (
  log: ToolingLog,
  strict: VariantManifest,
  template: VariantManifest,
  chunkThresholdBytes: number
): void => {
  log.info('--- Measured schema sizes (canonical minified) ---');
  for (const [name, manifest] of [
    ['strict', strict],
    ['template', template],
  ] as const) {
    log.info(
      `  ${name.padEnd(9)} mode=${manifest.mode} ` +
        `raw=${formatKb(manifest.sizeBytes)} gzip=${formatKb(manifest.gzipBytes)} ` +
        `defs=${manifest.defsCount} branches=${manifest.unionBranchCount}`
    );
  }
  log.info(`  chunk threshold (gzip): ${formatKb(chunkThresholdBytes)}`);
  log.info('Use these sizes to calibrate --chunk-threshold-bytes.');
};

const logTypeList = (log: ToolingLog, label: string, ids: string[]): void => {
  log.info(`--- ${label} (${ids.length}) ---`);
  for (const id of ids) {
    log.info(`  ${id}`);
  }
};

/**
 * Compare the produced step/trigger types against the approved `workflows_extensions`
 * fixtures and log any deviation. Returns `true` when approved definitions are
 * missing from the artifact (the actionable contract violation). "Unexpected"
 * produced types (built-ins/connectors for steps, built-in triggers) are logged
 * as informational context only and do not count as a failure.
 */
const runFixtureCheck = ({
  log,
  fixturesDir,
  stepTypes,
  triggerTypes,
}: {
  log: ToolingLog;
  fixturesDir: string;
  stepTypes: string[];
  triggerTypes: string[];
}): boolean => {
  let approved;
  try {
    approved = loadApprovedDefinitions(fixturesDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(`Skipping fixture check - could not read approved definitions: ${message}`);
    return false;
  }

  const report: FixtureDeviationReport = buildFixtureDeviationReport(approved, {
    stepTypes,
    triggerTypes,
  });

  log.info('--- Fixture check (approved workflows_extensions definitions) ---');
  log.info(
    `  approved: ${approved.stepIds.length} step(s), ${approved.triggerIds.length} trigger(s)`
  );

  const stepMissing = report.steps.missing;
  const triggerMissing = report.triggers.missing;

  if (stepMissing.length === 0) {
    log.info(`  steps: all ${approved.stepIds.length} approved step(s) present ✓`);
  } else {
    log.warning(
      `  steps: ${stepMissing.length} approved step(s) MISSING from the artifact: ${stepMissing.join(
        ', '
      )}`
    );
  }

  if (triggerMissing.length === 0) {
    log.info(`  triggers: all ${approved.triggerIds.length} approved trigger(s) present ✓`);
  } else {
    log.warning(
      `  triggers: ${triggerMissing.length} approved trigger(s) MISSING from the artifact: ${triggerMissing.join(
        ', '
      )}`
    );
  }

  // Triggers are meant to be an exhaustive, governed allowlist of registered
  // (non-built-in) triggers, so a produced trigger that is not approved is worth
  // surfacing. Steps intentionally include many built-ins/connectors beyond the
  // approved set, so we only report a count there to avoid noise.
  if (report.triggers.unexpected.length > 0) {
    log.warning(
      `  triggers: ${report.triggers.unexpected.length} produced trigger(s) NOT in the approved ` +
        `list (built-ins like alert/manual/scheduled are expected): ${report.triggers.unexpected.join(
          ', '
        )}`
    );
  }
  log.info(
    `  steps: ${report.steps.unexpected.length} produced step type(s) beyond the approved set ` +
      `(built-ins + connectors, expected)`
  );

  return stepMissing.length > 0 || triggerMissing.length > 0;
};
