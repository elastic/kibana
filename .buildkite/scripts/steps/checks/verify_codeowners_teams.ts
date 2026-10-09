/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CodeOwnersEntry } from '@kbn/code-owners';
import { getCodeOwnersEntries, getTeams } from '@kbn/code-owners';

const CONNECTOR_SPECS_ROOT_PATTERN = 'src/platform/packages/shared/kbn-connector-specs/src/specs';
const CONNECTOR_SPECS_ROOT = resolve(__dirname, '../../../..', CONNECTOR_SPECS_ROOT_PATTERN);

export interface ConnectorSpecsRootEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Collect the GitHub team handles tracked in the public team registry.
 */
export function getRegistryGithubTeams(): Set<string> {
  const teams = new Set<string>();

  for (const team of getTeams()) {
    if (team.github.team) {
      teams.add(team.github.team);
    }
  }

  return teams;
}

/**
 * Extract all `@elastic/<team>` references from CODEOWNERS.
 *
 * Only `elastic/`-scoped GitHub teams are validated; individual GitHub users
 * that appear as code owners are intentionally ignored. Handles are returned
 * without the leading `@`, matching the registry format.
 */
export function getCodeownersTeams(): Set<string> {
  const teams = new Set<string>();

  for (const entry of getCodeOwnersEntries()) {
    for (const team of entry.teams) {
      if (team.startsWith('elastic/')) {
        teams.add(team);
      }
    }
  }

  // Exclude the bot account used for backport branch overrides
  teams.delete('elastic/kibanamachine');

  return teams;
}

/**
 * Return the CODEOWNERS teams that are not tracked in the public team registry,
 * sorted for stable output.
 */
export function findUnrecognizedTeams(
  codeownersTeams: Set<string>,
  registryTeams: Set<string>
): string[] {
  return [...codeownersTeams].filter((team) => !registryTeams.has(team)).sort();
}

export function findConnectorSpecsOwnershipIssues(
  rootEntries: ConnectorSpecsRootEntry[],
  codeownersEntries: CodeOwnersEntry[]
): string[] {
  const issues: string[] = [];

  for (const rootEntry of rootEntries) {
    const entryPath = `${CONNECTOR_SPECS_ROOT_PATTERN}/${rootEntry.name}`;

    if (!rootEntry.isDirectory) {
      issues.push(`${entryPath} must be inside a connector directory, not at the specs root`);
      continue;
    }

    const expectedPattern = `${entryPath}/**`;
    const codeownersEntry = codeownersEntries.find(({ pattern }) => pattern === expectedPattern);
    const elasticTeams = codeownersEntry?.teams.filter((team) => team.startsWith('elastic/')) ?? [];

    if (elasticTeams.length === 0) {
      issues.push(`${expectedPattern} must explicitly assign an @elastic team`);
    }
  }

  return issues.sort();
}

function main(): void {
  console.log('Loading teams from the @kbn/code-owners registry...');
  const registryTeams = getRegistryGithubTeams();
  console.log(`Found ${registryTeams.size} teams in teams.jsonc`);

  console.log('Extracting teams from CODEOWNERS...');
  const codeownersEntries = getCodeOwnersEntries();
  const codeownersTeams = getCodeownersTeams();
  console.log(`Found ${codeownersTeams.size} unique teams in CODEOWNERS`);

  const invalidTeams = findUnrecognizedTeams(codeownersTeams, registryTeams);
  let hasErrors = false;

  if (invalidTeams.length > 0) {
    hasErrors = true;
    console.error('\nERROR: The following teams in CODEOWNERS are not recognized:');
    console.error('They are not present in the @kbn/code-owners registry (teams.jsonc).\n');
    for (const team of invalidTeams) {
      console.error(`  - ${team}`);
    }
    console.error(
      '\nTo fix: add the team to teams.jsonc in\n' +
        'src/platform/packages/private/kbn-code-owners,\n' +
        'or remove the invalid owner from CODEOWNERS.\n'
    );
  }

  const connectorSpecsRootEntries = readdirSync(CONNECTOR_SPECS_ROOT, {
    withFileTypes: true,
  }).map((rootEntry) => ({
    name: rootEntry.name,
    isDirectory: rootEntry.isDirectory(),
  }));
  const connectorOwnershipIssues = findConnectorSpecsOwnershipIssues(
    connectorSpecsRootEntries,
    codeownersEntries
  );

  if (connectorOwnershipIssues.length > 0) {
    hasErrors = true;
    console.error('\nERROR: Connector specs ownership is incomplete:');
    for (const issue of connectorOwnershipIssues) {
      console.error(`  - ${issue}`);
    }
    console.error(
      '\nAssign every connector directory to an @elastic team in .github/CODEOWNERS.\n' +
        'Ask @elastic/response-ops to review unexpected entries.\n'
    );
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('All CODEOWNERS teams are valid.');
}

if (require.main === module) {
  main();
}
