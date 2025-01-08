/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { RunWithCommands } from '@kbn/dev-cli-runner';
import { createFlagError, createFailError } from '@kbn/dev-cli-errors';

import { findPluginDir } from './find_plugin_dir';
import { loadKibanaPlatformPlugin } from './load_kibana_platform_plugin';
import * as Tasks from './tasks';
import { TaskContext } from './task_context';
import { resolveKibanaVersion } from './resolve_kibana_version';
import { loadConfig } from './config';

export function runCli() {
  new RunWithCommands({
    description: 'Some helper tasks for plugin-authors',
  })
    .command({
      name: 'build',
      description: `
        Copies files from the source into a zip archive that can be distributed for
        installation into production Kibana installs. The archive includes the non-
        development npm dependencies and builds itself using raw files in the source
        directory so make sure they are clean/up to date. The resulting archive can
        be found at:

          build/{plugin.id}-{kibanaVersion}.zip

      `,
      flags: {
        boolean: ['skip-archive'],
        string: ['kibana-version'],
        alias: {
          k: 'kibana-version',
        },
        help: `
          --skip-archive        Don't create the zip file, just create the build/kibana directory
          --kibana-version, -v  Kibana version this plugin will be built for
        `,
      },
      async run({ log, flags }) {
        const versionFlag = flags['kibana-version'];
        if (versionFlag !== undefined && typeof versionFlag !== 'string') {
          throw createFlagError('expected a single --kibana-version flag');
        }

        const skipArchive = flags['skip-archive'];
        if (skipArchive !== undefined && typeof skipArchive !== 'boolean') {
          throw createFlagError('expected a single --skip-archive flag');
        }

        const found = findPluginDir();
        if (!found) {
          throw createFailError(
            `Unable to find Kibana Platform plugin in [${process.cwd()}] or any of its parent directories. Has it been migrated properly? Does it have a kibana.json file?`
          );
        }

        if (found.type === 'package') {
          throw createFailError(`the plugin helpers do not currently support "package plugins"`);
        }

        const plugin = loadKibanaPlatformPlugin(found.dir);
        const config = await loadConfig(log, plugin);
        const kibanaVersion = await resolveKibanaVersion(versionFlag, plugin);
        const sourceDir = plugin.directory;
        const buildDir = Path.resolve(plugin.directory, 'build/kibana', plugin.manifest.id);

        const context: TaskContext = {
          log,
          dev: false,
          dist: true,
          plugin,
          config,
          sourceDir,
          buildDir,
          kibanaVersion,
        };

        await Tasks.initTargets(context);
        await Tasks.buildBazelPackages(context);
        await Tasks.optimize(context);
        await Tasks.brotliCompressBundles(context);
        await Tasks.writePublicAssets(context);
        await Tasks.writeServerFiles(context);
        await Tasks.yarnInstall(context);

        if (skipArchive !== true) {
          await Tasks.createArchive(context);
        }
      },
    })
    .command({
      name: 'dev',
      description: `
        Builds the current plugin ui browser side so it can be picked up by Kibana
        during development

      `,
      flags: {
        boolean: ['dist', 'watch'],
        alias: {
          d: 'dist',
          w: 'watch',
        },
        help: `
          --dist, -d  Outputs bundles in dist mode instead
          --watch, -w  Starts the watch mode
        `,
      },
      async run({ log, flags }) {
        const dist = flags.dist;
        if (dist !== undefined && typeof dist !== 'boolean') {
          throw createFlagError('expected a single --dist flag');
        }

        const watch = flags.watch;
        if (watch !== undefined && typeof watch !== 'boolean') {
          throw createFlagError('expected a single --watch flag');
        }

        const found = findPluginDir();
        if (!found) {
          throw createFailError(
            `Unable to find Kibana Platform plugin in [${process.cwd()}] or any of its parent directories. Has it been migrated properly? Does it have a kibana.json file?`
          );
        }

        if (found.type === 'package') {
          throw createFailError(`the plugin helpers do not currently support "package plugins"`);
        }

        const plugin = loadKibanaPlatformPlugin(found.dir);

        if (!plugin.manifest.ui) {
          log.info(
            'Your plugin is server only and there is no need to run a dev task in order to get it ready to test. Please just run `yarn start` at the Kibana root and your plugin will be started.'
          );
          return;
        }

        const config = await loadConfig(log, plugin);
        const sourceDir = plugin.directory;

        const context: TaskContext = {
          log,
          dev: true,
          dist,
          watch,
          plugin,
          config,
          sourceDir,
          buildDir: '',
          kibanaVersion: 'kibana',
        };

        await Tasks.initDev(context);
        await Tasks.buildBazelPackages(context);
        await Tasks.optimize(context);
      },
    })
    .execute();
}
