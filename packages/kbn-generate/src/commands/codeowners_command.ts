/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT, kibanaPackageJson } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

import type { GenerateCommand } from '../generate_command';

const REL = '.github/CODEOWNERS';

const UNIVERSAL_MAINTENANCE_TEAMS = ['@elastic/kibana-operations'];
// These paths within every package are co-owned by universal maintenance teams
const packageCoOwnedPaths = ['moon.yml'];

const GENERATED_START = `####
## Everything at the top of the codeowners file is auto generated based on the
## "owner" fields in the kibana.jsonc files at the root of each package. This
## file is automatically updated by CI or can be updated locally by running
## \`node scripts/generate codeowners\`.
####

`;

const GENERATED_END = `
####
## Everything below this line overrides the default assignments for each package.
## Items lower in the file have higher precedence:
##  https://help.github.com/articles/about-codeowners/
####
`;

const ULTIMATE_PRIORITY_RULES_COMMENT = `
####
## These rules are always last so they take ultimate priority over everything else
####
`;

const ULTIMATE_PRIORITY_KIBANAMACHINE = `
# See https://github.com/elastic/kibana/pull/199404
# Prevent backport assignments
* @kibanamachine
`;

const ULTIMATE_PRIORITY_RULES =
  kibanaPackageJson.branch === 'main'
    ? ULTIMATE_PRIORITY_RULES_COMMENT
    : ULTIMATE_PRIORITY_RULES_COMMENT + ULTIMATE_PRIORITY_KIBANAMACHINE;

export const CodeownersCommand: GenerateCommand = {
  name: 'codeowners',
  description: 'Update the codeowners file based on the package manifest files',
  usage: 'node scripts/generate codeowners',
  async run({ log }) {
    const pkgs = getPackages(REPO_ROOT);
    const path = Path.resolve(REPO_ROOT, REL);
    const oldCodeowners = await Fsp.readFile(path, 'utf8');
    let content = oldCodeowners;

    // strip the old generated output
    const genEnd = content.indexOf(GENERATED_END);
    if (genEnd !== -1) {
      content = content.slice(genEnd + GENERATED_END.length);
    }

    // strip the old ultimate rules
    const ultStart = content.indexOf(ULTIMATE_PRIORITY_RULES_COMMENT);
    if (ultStart !== -1) {
      content = content.slice(0, ultStart);
    }

    // sort generated entries by directory name
    // this improves readability and makes sure that ownership for nested
    // test plugins is not overridden by the parent package's entry
    pkgs.sort((a, b) => a.directory.localeCompare(b.directory));
    const packageDirsOwnerships =
      pkgs
        .flatMap((pkg) => {
          const entries = [];

          // team owns the folder
          const packageOwners = (pkg.manifest.owner || []).join(' ');
          entries.push(pkg.normalizedRepoRelativeDir + ' ' + packageOwners);

          // team co-owns specific paths within the package
          const sharedOwnersSet = packageOwners + ' ' + UNIVERSAL_MAINTENANCE_TEAMS.join(' ');
          packageCoOwnedPaths.forEach((subPath) => {
            if (Fs.existsSync(Path.join(pkg.directory, subPath))) {
              const filePath = Path.posix.join(pkg.normalizedRepoRelativeDir, subPath);
              entries.push(filePath + ' ' + sharedOwnersSet);
            }
          });
          return entries;
        })
        .join('\n') + '\n\n';

    const newCodeowners = [
      GENERATED_START,
      packageDirsOwnerships,
      GENERATED_END,
      content,
      ULTIMATE_PRIORITY_RULES,
    ].join('');

    if (newCodeowners === oldCodeowners) {
      log.success(`${REL} is already up-to-date`);
      return;
    }

    await Fsp.writeFile(path, newCodeowners);
    log.info(`${REL} updated`);
  },
};
