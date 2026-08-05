/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCodeOwnersEntries, getTeams } from '@kbn/code-owners';

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

function main(): void {
  console.log('Loading teams from the @kbn/code-owners registry...');
  const registryTeams = getRegistryGithubTeams();
  console.log(`Found ${registryTeams.size} teams in teams.jsonc`);

  console.log('Extracting teams from CODEOWNERS...');
  const codeownersTeams = getCodeownersTeams();
  console.log(`Found ${codeownersTeams.size} unique teams in CODEOWNERS`);

  const invalidTeams = findUnrecognizedTeams(codeownersTeams, registryTeams);

  if (invalidTeams.length > 0) {
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
    process.exit(1);
  }

  console.log('All CODEOWNERS teams are valid.');
}

if (require.main === module) {
  main();
}
