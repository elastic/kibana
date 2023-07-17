/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

import type { GenerateCommand } from '../generate_command';

const REL = '.github/CODEOWNERS';

const GENERATED_START = `

####
## Everything below this comment is automatically generated based on kibana.jsonc
## "owner" fields. This file is automatically updated by CI or can be updated locally
## by running \`node scripts/generate codeowners\`.
####

`;

const GENERATED_TRAILER = `

# Design (at the bottom for specificity of SASS files)
**/*.scss  @elastic/kibana-design
`;

function normalizeDir(dirish: string): string {
  const trim = dirish.trim();
  if (trim.startsWith('/')) {
    return normalizeDir(trim.slice(1));
  }

  if (trim.endsWith('/')) {
    return normalizeDir(trim.slice(0, -1));
  }

  return trim;
}

export const CodeownersCommand: GenerateCommand = {
  name: 'codeowners',
  description: 'Update the codeowners file based on the package manifest files',
  usage: 'node scripts/generate codeowners',
  async run({ log }) {
    const pkgs = getPackages(REPO_ROOT);
    const coPath = Path.resolve(REPO_ROOT, REL);
    const codeowners = await Fsp.readFile(coPath, 'utf8');
    let genStart: number | undefined = codeowners.indexOf(GENERATED_START);
    if (genStart === -1) {
      genStart = undefined;
      log.warning(`${REL} doesn't include the expected start-marker for injecting generated text`);
    }

    const pkgDirs = new Set(pkgs.map((pkg) => pkg.normalizedRepoRelativeDir));
    const lines = [];

    for (const line of codeowners.slice(0, genStart).split('\n')) {
      if (line.startsWith('#') || !line.trim()) {
        lines.push(line);
        continue;
      }

      const dir = normalizeDir(line.split('@')[0]);
      if (!pkgDirs.has(dir)) {
        lines.push(line);
      }
    }

    const newCodeowners = `${lines.join('\n')}${GENERATED_START}${pkgs
      .map((pkg) => `${pkg.normalizedRepoRelativeDir} ${pkg.manifest.owner.join(' ')}`)
      .join('\n')}${GENERATED_TRAILER}`;

    if (codeowners === newCodeowners) {
      log.success(`${REL} is already up-to-date`);
      return;
    }

    await Fsp.writeFile(coPath, newCodeowners);
    log.info(`${REL} updated`);
  },
};
