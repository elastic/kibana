/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import { detectKibana, listConnectors, createConnector } from './kibana_client';
import { loadManifests, resolveManifestSecrets } from './manifest_loader';
import type { ConnectorResult } from './types';

interface CreateConnectorsOptions {
  log: ToolingLog;
  dryRun: boolean;
}

export async function createConnectors({
  log,
  dryRun,
}: CreateConnectorsOptions): Promise<ConnectorResult[]> {
  const allManifests = loadManifests();
  const disabledCount = allManifests.filter((m) => m.enabled === false).length;
  const manifests = allManifests.filter((m) => m.enabled !== false);
  log.info(
    `Loaded ${allManifests.length} connector manifest(s)` +
      (disabledCount > 0 ? ` (${disabledCount} disabled)` : '')
  );

  if (dryRun) {
    log.info(chalk.yellow('DRY RUN — no connectors will be created'));
  }

  log.info('Detecting Kibana...');
  const connection = await detectKibana();
  log.info(`Connected to Kibana at ${chalk.cyan(connection.url)}`);

  const existing = await listConnectors(connection);
  const existingNames = new Set(existing.map((c) => c.name));
  log.info(`Found ${existing.length} existing connector(s)`);

  const results: ConnectorResult[] = [];

  for (const manifest of manifests) {
    if (existingNames.has(manifest.name)) {
      log.info(`  ${chalk.yellow('SKIP')} ${manifest.name} — already exists`);
      results.push({
        name: manifest.name,
        specId: manifest.spec_id,
        status: 'skipped',
        message: 'Connector with this name already exists',
      });
      continue;
    }

    if (dryRun) {
      log.info(`  ${chalk.green('DRY')}  ${manifest.name} (${manifest.spec_id})`);
      log.info(`         auth_type: ${manifest.auth_type}`);
      log.info(`         config: ${JSON.stringify(manifest.config ?? {})}`);
      log.info(
        `         secrets: { ${Object.keys(manifest.secrets)
          .map((k) => `${k}: ***`)
          .join(', ')} }`
      );
      results.push({
        name: manifest.name,
        specId: manifest.spec_id,
        status: 'created',
        message: 'dry run',
      });
      continue;
    }

    let resolved;
    try {
      resolved = await resolveManifestSecrets(manifest);
    } catch (err: any) {
      log.info(`  ${chalk.red('FAIL')} ${manifest.name}`);
      results.push({
        name: manifest.name,
        specId: manifest.spec_id,
        status: 'failed',
        message: err.message,
      });
      continue;
    }

    try {
      const response = await createConnector(connection, {
        connector_type_id: resolved.specId,
        name: resolved.name,
        config: resolved.config,
        secrets: resolved.secrets,
      });
      log.info(`  ${chalk.green('OK')}   ${manifest.name} → id: ${response.id}`);
      results.push({
        name: manifest.name,
        specId: manifest.spec_id,
        status: 'created',
        connectorId: response.id,
      });
    } catch (err: any) {
      log.info(`  ${chalk.red('FAIL')} ${manifest.name}`);
      results.push({
        name: manifest.name,
        specId: manifest.spec_id,
        status: 'failed',
        message: err.message,
      });
    }
  }

  const created = results.filter((r) => r.status === 'created').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  log.write('');
  log.write(
    `${chalk.green('Created')}: ${created}  ${chalk.yellow('Skipped')}: ${skipped}  ${chalk.red(
      'Failed'
    )}: ${failed}`
  );

  if (failed > 0) {
    log.write('');
    log.write('Failed connectors:');
    const failedResults = results.filter((res) => res.status === 'failed');
    const hasVaultErrors = failedResults.some((r) =>
      r.message?.includes('Failed to read secret from vault')
    );
    for (const r of failedResults) {
      const reason = r.message?.split('\n')[0] ?? 'unknown error';
      log.write(`  - ${r.name}: ${reason}`);
    }
    if (hasVaultErrors) {
      log.write('');
      log.write(chalk.yellow('⚠ Vault errors detected. Make sure you are logged in:'));
      log.write(`  ${chalk.cyan(`vault login --method oidc`)}`);
    }
  }

  return results;
}
