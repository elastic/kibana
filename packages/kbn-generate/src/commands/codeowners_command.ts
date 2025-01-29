/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

import type { GenerateCommand } from '../generate_command';

const REL = '.github/CODEOWNERS';

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

const ULTIMATE_PRIORITY_RULES = `
####
## These rules are always last so they take ultimate priority over everything else
####
`;

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
    const ultStart = content.indexOf(ULTIMATE_PRIORITY_RULES);
    if (ultStart !== -1) {
      content = content.slice(0, ultStart);
    }

    // sort genarated entries by directory name
    // this improves readability and makes sure that ownership for nested
    // test plugins is not overriden by the parent package's entry
    pkgs.sort((a, b) => a.directory.localeCompare(b.directory));

    const newCodeowners = `${GENERATED_START}${pkgs
      .map(
        (pkg) =>
          pkg.normalizedRepoRelativeDir +
          (pkg.manifest.owner.length ? ' ' + pkg.manifest.owner.join(' ') : '')
      )
      .join('\n')}${GENERATED_END}${content}${ULTIMATE_PRIORITY_RULES}`;

    if (newCodeowners === oldCodeowners) {
      log.success(`${REL} is already up-to-date`);
      return;
    }

    await Fsp.writeFile(path, newCodeowners);
    log.info(`${REL} updated`);
  },
};
