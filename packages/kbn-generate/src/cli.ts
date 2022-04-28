/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RunWithCommands } from '@kbn/dev-utils';

import { Render } from './lib/render';
import { ContextExtensions } from './generate_command';

import { PackageCommand } from './commands/package_command';
import { PackagesBuildManifestCommand } from './commands/packages_build_manifest_command';

/**
 * Runs the generate CLI. Called by `node scripts/generate` and not intended for use outside of that script
 */
export function runGenerateCli() {
  new RunWithCommands<ContextExtensions>(
    {
      description: 'Run generators for different components in Kibana',
      extendContext(context) {
        return {
          render: new Render(context.log),
        };
      },
    },
    [PackageCommand, PackagesBuildManifestCommand]
  ).execute();
}
