/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { listManifestFiles, printManifest, updateManifest } from './manifest';
import { relocateModules } from './relocate';

/**
 * A CLI to manipulate Kibana package manifest files
 */
export const runKbnManifestCli = () => {
  run(
    async ({ log, flags }) => {
      if (flags.list === 'all') {
        await listManifestFiles(flags, log);
      } else if (typeof flags.relocate === 'string' && flags.relocate!.length > 0) {
        await relocateModules(flags.relocate, log);
      } else {
        if (!flags.package && !flags.plugin) {
          throw new Error('You must specify the identifer of the --package or --plugin to update.');
        }
        await updateManifest(flags, log);
        await printManifest(flags, log);
      }
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: ['list', 'relocate', 'package', 'plugin', 'set', 'unset'],
        help: `
          Usage: node scripts/manifest --package <packageId> --set group=platform --set visibility=private
          --list all List all the manifests
          --relocate <owner> Relocate all modules (packages and plugins) belonging to the specified owner
          --package [packageId] Select a package to update.
          --plugin [pluginId] Select a plugin to update.
          --set [property]=[value] Set the desired "[property]": "[value]"
          --unset [property] Removes the desired "[property]: value" from the manifest
        `,
      },
    }
  );
};
