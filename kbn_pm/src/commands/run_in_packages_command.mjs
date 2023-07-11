/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '../lib/paths.mjs';
import { run, spawnStreaming } from '../lib/spawn.mjs';
import External from '../lib/external_packages.js';

/** @type {import('../lib/command').Command} */
export const command = {
  name: 'run-in-packages',
  usage: '[...flags] <command> [...subFlags]',
  description: `
    Run script defined in package.json in each package that contains that script. Any flags passed
    after the script name will be passed directly to the script.
  `,
  flagsHelp: `
    --filter             package name to be filter packages by, can be specified multiple times
                          and only packages matching this filter will be matched
    --exclude            package name to be excluded, can be specified multiple times
    --quiet              only log the output of commands if they fail
  `,
  reportTimings: {
    group: 'scripts/kbn run',
    id: 'total',
  },
  async run({ log, args }) {
    const scriptName = args.getPositionalArgs()[0];

    const rawArgs = args.getRawArgs();
    const i = rawArgs.indexOf(scriptName);
    const scriptArgs = i !== -1 ? rawArgs.slice(i + 1) : [];

    const exclude = args.getStringValues('exclude') ?? [];
    const include = args.getStringValues('include') ?? [];

    const { getPackages } = External['@kbn/repo-packages']();
    const packages = getPackages(REPO_ROOT);
    for (const { manifest, pkg, normalizedRepoRelativeDir } of packages) {
      if (
        exclude.includes(manifest.id) ||
        (include.length && !include.includes(manifest.id)) ||
        !pkg?.scripts ||
        !Object.hasOwn(pkg.scripts, scriptName)
      ) {
        continue;
      }

      log.debug(
        `running [${scriptName}] script in [${pkg.name}]`,
        scriptArgs.length ? `with args [${scriptArgs.join(' ')}]` : ''
      );

      const cwd = Path.resolve(REPO_ROOT, normalizedRepoRelativeDir);

      if (args.getBooleanValue('quiet')) {
        await run('yarn', ['run', scriptName, ...scriptArgs], {
          cwd,
          description: `${scriptName} in ${pkg.name}`,
        });
      } else {
        await spawnStreaming('yarn', ['run', scriptName, ...scriptArgs], {
          cwd: cwd,
          logPrefix: '    ',
        });
      }

      log.success(`Ran [${scriptName}] in [${pkg.name}]`);
    }
  },
};
