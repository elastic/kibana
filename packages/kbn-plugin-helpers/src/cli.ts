/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { RunWithCommands, createFlagError, createFailError } from '@kbn/dev-utils';

import { findKibanaJson } from './find_kibana_json';
import { loadKibanaPlatformPlugin } from './load_kibana_platform_plugin';
import * as Tasks from './tasks';
import { BuildContext } from './build_context';
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
          --kibana-version, -v  Kibana version that the
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

        const pluginDir = await findKibanaJson(process.cwd());
        if (!pluginDir) {
          throw createFailError(
            `Unable to find Kibana Platform plugin in [${process.cwd()}] or any of its parent directories. Has it been migrated properly? Does it have a kibana.json file?`
          );
        }

        const plugin = loadKibanaPlatformPlugin(pluginDir);
        const config = await loadConfig(log, plugin);
        const kibanaVersion = await resolveKibanaVersion(versionFlag, plugin);
        const sourceDir = plugin.directory;
        const buildDir = Path.resolve(plugin.directory, 'build/kibana', plugin.manifest.id);

        const context: BuildContext = {
          log,
          plugin,
          config,
          sourceDir,
          buildDir,
          kibanaVersion,
        };

        await Tasks.initTargets(context);
        await Tasks.optimize(context);
        await Tasks.writePublicAssets(context);
        await Tasks.writeServerFiles(context);
        await Tasks.yarnInstall(context);

        if (skipArchive !== true) {
          await Tasks.createArchive(context);
        }
      },
    })
    .execute();
}
