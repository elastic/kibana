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
function getRegistryGithubTeams(): Set<string> {
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
function getCodeownersTeams(): Set<string> {
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

function main(): void {
  console.log('Loading teams from the @kbn/code-owners registry...');
  const registryTeams = getRegistryGithubTeams();
  console.log(`Found ${registryTeams.size} teams in teams.jsonc`);

  console.log('Extracting teams from CODEOWNERS...');
  const codeownersTeams = getCodeownersTeams();
  console.log(`Found ${codeownersTeams.size} unique teams in CODEOWNERS`);

  let hasErrors = false;

  const invalidTeams = [...codeownersTeams].filter((team) => !registryTeams.has(team));

  if (invalidTeams.length > 0) {
    hasErrors = true;
    console.error('\nERROR: The following teams in CODEOWNERS are not recognized:');
    console.error('They are not present in the @kbn/code-owners registry (teams.jsonc)');
    console.error('and are not in the known-valid allowlist.\n');
    for (const team of invalidTeams.sort()) {
      console.error(`  - ${team}`);
    }
    console.error(
      '\nTo fix: either add the team to teams.jsonc in\n' +
        'src/platform/packages/private/kbn-code-owners,\n' +
        'or add it to ALLOWED_UNTRACKED_TEAMS in verify_codeowners_teams.ts\n' +
        '(requires approval from @elastic/kibana-security).\n'
    );
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('All CODEOWNERS teams are valid.');
}

main();
