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
 * Teams that are allowed to be untracked in the public team registry (`@kbn/code-owners` `teams.jsonc`).
 */
const ALLOWED_UNTRACKED_TEAMS = new Set([
  'elastic/cloud-services',
  'elastic/contextual-security',
  'elastic/docs',
  'elastic/eui',
  'elastic/eui-team',
  'elastic/jinastic',
  'elastic/kibana-accessibility',
  'elastic/kibana-performance-testing',
  'elastic/kibana-tech-leads',
  'elastic/kibana-telemetry',
  'elastic/kibana-visualization',
  'elastic/obs-cloudnative-monitoring',
  'elastic/obs-sig-events-team',
  'elastic/obs-ux-management-team',
  'elastic/observability-bi',
  'elastic/observability-design',
  'elastic/observability-ui',
  'elastic/observablt-robots',
  'elastic/platform-docs',
  'elastic/search-design',
  'elastic/search-inference-team',
  'elastic/security-design',
  'elastic/security-detection-platform',
  'elastic/security-engineering-productivity',
  'elastic/security-genai-research-and-development',
  'elastic/security-ml',
  'elastic/security-pds-deployment',
  'elastic/ski-docs',
  'elastic/streams-ui',
]);

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

  const invalidTeams = [...codeownersTeams].filter(
    (team) => !registryTeams.has(team) && !ALLOWED_UNTRACKED_TEAMS.has(team)
  );

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

  // Reverse check: every allowlisted team must still be referenced in CODEOWNERS,
  // otherwise the allowlist has accumulated stale entries that should be removed.
  const staleAllowlistTeams = [...ALLOWED_UNTRACKED_TEAMS].filter(
    (team) => !codeownersTeams.has(team)
  );

  if (staleAllowlistTeams.length > 0) {
    hasErrors = true;
    console.error('\nERROR: The following ALLOWED_UNTRACKED_TEAMS entries are no longer used:');
    console.error('They are not referenced anywhere in CODEOWNERS.\n');
    for (const team of staleAllowlistTeams.sort()) {
      console.error(`  - ${team}`);
    }
    console.error(
      '\nTo fix: remove these teams from ALLOWED_UNTRACKED_TEAMS in\nverify_codeowners_teams.ts\n'
    );
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('All CODEOWNERS teams are valid.');
}

main();
