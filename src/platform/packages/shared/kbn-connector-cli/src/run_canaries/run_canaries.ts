/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { getConnectorSpec, TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import type { ActionDefinition, ConnectorSpec } from '@kbn/connector-specs';
import chalk from 'chalk';
import {
  createConnector,
  detectKibana,
  executeConnector,
  listConnectors,
  updateConnector,
} from '../create_connectors/kibana_client';
import type { KibanaConnection } from '../create_connectors/kibana_client';
import { loadManifests, resolveManifestSecrets } from '../create_connectors/manifest_loader';
import type { Manifest } from '../create_connectors/types';
import { checkShape } from './check_shape';
import { classifyErrorResult, classifyThrown } from './classify';
import { loadFixtures } from './fixture_loader';
import type {
  CanaryOutcome,
  CanaryResult,
  Classification,
  FixtureCase,
  FixtureFile,
} from './types';

interface RunCanariesOptions {
  log: ToolingLog;
  dryRun: boolean;
  /** Restrict the run to these spec ids (the leading dot is optional). */
  only?: string[];
}

interface ExistingConnector {
  id: string;
  name: string;
  connector_type_id: string;
}

const OUTCOME_TAGS: Record<CanaryOutcome, string> = {
  ok: chalk.green('OK     '),
  auth: chalk.red('AUTH   '),
  test: chalk.red('TEST   '),
  error: chalk.red('ERROR  '),
  misc: chalk.yellow('MISC   '),
  fixture: chalk.magenta('FIXTURE'),
};

const normalizeSpecId = (specId: string): string => specId.replace(/^\./, '');

const describeCase = (specId: string, fixtureCase: FixtureCase): string =>
  `${specId} ${fixtureCase.action}${fixtureCase.name ? ` (${fixtureCase.name})` : ''}`;

type RunnableAction = Pick<ActionDefinition, 'scope' | 'output'> & {
  input?: ActionDefinition['input'];
};

/** Looks up an action, treating the spec's reserved `_test` sub-action (the connection check) as a read action. */
const getAction = (spec: ConnectorSpec, name: string): RunnableAction | undefined => {
  if (name === TEST_CONNECTOR_SUB_ACTION) {
    return spec.test?.enabled ? { scope: 'read' } : undefined;
  }
  return spec.actions?.[name];
};

/** Returns a `fixture` classification if the case can't run against the spec (unknown or non-read action, bad input). */
export const validateCase = (
  spec: ConnectorSpec,
  fixtureCase: FixtureCase
): Classification | undefined => {
  const action = getAction(spec, fixtureCase.action);
  if (!action) {
    return { outcome: 'fixture', reason: `unknown action "${fixtureCase.action}"` };
  }
  if (action.scope !== 'read') {
    return {
      outcome: 'fixture',
      reason: `action "${fixtureCase.action}" has scope "${action.scope}"; canaries only run read actions`,
    };
  }
  const parsed = action.input?.safeParse(fixtureCase.input);
  if (parsed && !parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { outcome: 'fixture', reason: `input does not match the action's schema: ${issues}` };
  }
  return undefined;
};

/** Finds the manifest's connector, or creates it; an existing one gets its secrets re-synced so rotated credentials apply. */
const ensureConnector = async (
  connection: KibanaConnection,
  existing: ExistingConnector[],
  manifest: Manifest
): Promise<string> => {
  const found = existing.find(
    (c) => c.name === manifest.name && c.connector_type_id === manifest.spec_id
  );
  const resolved = await resolveManifestSecrets(manifest);
  if (found) {
    await updateConnector(connection, found.id, {
      name: resolved.name,
      config: resolved.config,
      secrets: resolved.secrets,
    });
    return found.id;
  }

  const created = await createConnector(connection, {
    connector_type_id: resolved.specId,
    name: resolved.name,
    config: resolved.config,
    secrets: resolved.secrets,
  });
  existing.push({ id: created.id, name: created.name, connector_type_id: resolved.specId });
  return created.id;
};

const executeCase = async (
  connection: KibanaConnection,
  connectorId: string,
  spec: ConnectorSpec,
  fixtureCase: FixtureCase
): Promise<Classification> => {
  let result;
  try {
    result = await executeConnector(connection, connectorId, {
      subAction: fixtureCase.action,
      subActionParams: fixtureCase.input,
    });
  } catch (err) {
    return classifyThrown(err);
  }

  if (result.status === 'error') return classifyErrorResult(result);

  const mismatches = checkShape(result.data, fixtureCase.expect);
  const outputSchema = getAction(spec, fixtureCase.action)?.output;
  const outputParse = outputSchema?.safeParse(result.data);
  if (outputParse && !outputParse.success) {
    mismatches.push(
      `response does not match the action's output schema: ${outputParse.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')}`
    );
  }

  return mismatches.length > 0
    ? { outcome: 'test', reason: mismatches.join('; ') }
    : { outcome: 'ok' };
};

interface FixtureRun {
  results: CanaryResult[];
  lines: string[];
}

const recordResult = (
  run: FixtureRun,
  specId: string,
  fixtureCase: FixtureCase,
  classification: Classification
): void => {
  const label = describeCase(specId, fixtureCase);
  run.results.push({ specId, action: fixtureCase.action, label, ...classification });
  const reason = classification.reason ? ` — ${classification.reason}` : '';
  run.lines.push(`  ${OUTCOME_TAGS[classification.outcome]} ${label}${reason}`);
};

export const runCanaries = async ({
  log,
  dryRun,
  only = [],
}: RunCanariesOptions): Promise<CanaryResult[]> => {
  const wanted = new Set(only.map(normalizeSpecId));
  const allFixtures = loadFixtures();
  const fixtures = allFixtures.filter(
    (fixture) => wanted.size === 0 || wanted.has(normalizeSpecId(fixture.spec_id))
  );
  if (only.length > 0 && fixtures.length === 0) {
    throw new Error(
      `No fixtures match --only ${only.join(', ')}. Available: ${allFixtures
        .map((f) => f.spec_id)
        .join(', ')}`
    );
  }
  log.info(`Loaded ${fixtures.length} fixture file(s)`);

  if (dryRun) {
    log.info(chalk.yellow('DRY RUN — fixtures are validated, nothing is executed'));
  }

  const manifests = loadManifests().filter((m) => m.enabled !== false);

  let connection: KibanaConnection | undefined;
  const existing: ExistingConnector[] = [];
  if (!dryRun) {
    log.info('Detecting Kibana...');
    connection = await detectKibana();
    log.info(`Connected to Kibana at ${chalk.cyan(connection.url)}`);
    existing.push(...(await listConnectors(connection)));
  }

  // Each fixture file targets its own connector (spec ids are unique), so files run concurrently.
  const runFixture = async (fixture: FixtureFile, run: FixtureRun): Promise<void> => {
    const record = (fixtureCase: FixtureCase, classification: Classification) =>
      recordResult(run, fixture.spec_id, fixtureCase, classification);

    const cases = fixture.cases.filter((c) => c.enabled !== false);
    const skipped = fixture.cases.length - cases.length;
    run.lines.push(
      `${chalk.bold(fixture.spec_id)}: ${cases.length} case(s)` +
        (skipped > 0 ? ` (${skipped} disabled)` : '')
    );

    const spec = getConnectorSpec(fixture.spec_id);
    const manifest = manifests.find((m) => m.spec_id === fixture.spec_id);
    if (!spec || !manifest) {
      const reason = !spec
        ? `no connector spec with id ${fixture.spec_id}`
        : `no enabled manifest with spec_id ${fixture.spec_id}`;
      cases.forEach((fixtureCase) => record(fixtureCase, { outcome: 'fixture', reason }));
      return;
    }

    let connectorId: string | undefined;
    let connectorFailure: Classification | undefined;

    for (const fixtureCase of cases) {
      const invalid = validateCase(spec, fixtureCase);
      if (invalid) {
        record(fixtureCase, invalid);
        continue;
      }
      if (!connection) {
        record(fixtureCase, { outcome: 'ok', reason: 'dry run' });
        continue;
      }

      if (!connectorId && !connectorFailure) {
        try {
          connectorId = await ensureConnector(connection, existing, manifest);
        } catch (err) {
          const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
          connectorFailure = {
            outcome: 'misc',
            reason: `could not set up the "${manifest.name}" connector: ${message}${
              message.includes('vault') ? ' (try: vault login --method oidc)' : ''
            }`,
          };
        }
      }
      if (!connectorId) {
        record(
          fixtureCase,
          connectorFailure ?? { outcome: 'misc', reason: 'connector unavailable' }
        );
        continue;
      }

      record(fixtureCase, await executeCase(connection, connectorId, spec, fixtureCase));
    }
  };

  // A fixture's block is printed as soon as it finishes, and an unexpected throw only fails that fixture's remaining cases.
  const runs = await Promise.all(
    fixtures.map(async (fixture) => {
      const run: FixtureRun = { results: [], lines: [] };
      try {
        await runFixture(fixture, run);
      } catch (err) {
        const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
        fixture.cases
          .filter((c) => c.enabled !== false)
          .slice(run.results.length)
          .forEach((fixtureCase) =>
            recordResult(run, fixture.spec_id, fixtureCase, {
              outcome: 'misc',
              reason: `unexpected runner error: ${message}`,
            })
          );
      }
      run.lines.forEach((line) => log.info(line));
      return run;
    })
  );
  const results = runs.flatMap((run) => run.results);

  const counts: Record<CanaryOutcome, number> = {
    ok: 0,
    auth: 0,
    test: 0,
    error: 0,
    misc: 0,
    fixture: 0,
  };
  for (const { outcome } of results) counts[outcome] += 1;
  log.write('');
  log.write((Object.keys(counts) as CanaryOutcome[]).map((k) => `${k}: ${counts[k]}`).join('  '));

  return results;
};
