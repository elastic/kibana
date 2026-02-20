/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { uniq } from 'lodash';

function listTeams() {
  const packages = getPackages(REPO_ROOT);

  const teams = uniq(packages.flatMap((pkg) => pkg.manifest.owner));

  return {
    teams,
  };
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node -r @kbn/setup-node-env list_teams.ts');
    console.log('');
    console.log('Lists all GitHub teams that own Kibana packages/plugins.');
    process.exit(0);
  }

  const result = listTeams();
  console.log(JSON.stringify(result, null, 2));
}

main();
