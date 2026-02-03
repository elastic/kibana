/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import execa from 'execa';

export function runGetChangedPackagesCli() {
  run(
    async ({ flags, log }) => {
      const base = flags.mergeBase || process.env.GITHUB_PR_MERGE_BASE || 'origin/main';

      // Get list of changed files
      let changedFiles: string[] = [];

      try {
        const { stdout } = await execa('git', ['diff', '--name-only', `${base}...HEAD`], {
          cwd: REPO_ROOT,
        });

        changedFiles = stdout
          .trim()
          .split('\n')
          .filter((f) => f.length > 0);
      } catch (error) {
        log.error(`Error getting changed files: ${error.message}`);
        return;
      }

      if (changedFiles.length === 0) {
        log.info('No changed files detected');
        // Output as JSON for easy parsing in shell script
        // eslint-disable-next-line no-console
        console.log(JSON.stringify([]));
        return;
      }

      // Get all packages
      const allPackages = getPackages(REPO_ROOT);

      // Create a map from normalized repo-relative directory to package
      const packagesByDir = new Map(allPackages.map((pkg) => [pkg.normalizedRepoRelativeDir, pkg]));

      // Find which packages the changed files belong to
      const changedPackageIds = new Set<string>();

      for (const file of changedFiles) {
        // Find the package this file belongs to by checking if the file path
        // starts with any package directory (checking longest paths first)
        const sortedDirs = Array.from(packagesByDir.keys()).sort((a, b) => b.length - a.length);

        for (const dir of sortedDirs) {
          if (file.startsWith(dir + '/') || file === dir) {
            const pkg = packagesByDir.get(dir);

            if (pkg) {
              // Use plugin.id for plugins, manifest.id for packages
              const id = pkg.isPlugin() ? pkg.manifest.plugin.id : pkg.manifest.id;
              changedPackageIds.add(id);
              break;
            }
          }
        }
      }

      const changedPlugins = Array.from(changedPackageIds).sort();

      if (changedPlugins.length === 0) {
        log.info('Changed files do not belong to any tracked packages');
      } else {
        log.success(`Found ${changedPlugins.length} changed plugin(s)/package(s):`);
        changedPlugins.forEach((id) => log.info(`  - ${id}`));
      }

      // Output as JSON for easy parsing in shell script
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(changedPlugins));
    },
    {
      description: 'Get the changed packages',
      flags: {
        help: `
          --merge-base [string]    The git ref to compare against (defaults to GITHUB_PR_MERGE_BASE env var or 'origin/main')
        `,
      },
    }
  );
}
