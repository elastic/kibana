/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RunWithCommands } from '@kbn/dev-cli-runner';

import { Render } from './lib/render';
import { ContextExtensions } from './generate_command';

import { PackageCommand } from './commands/package_command';
import { CodeownersCommand } from './commands/codeowners_command';

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
    [PackageCommand, CodeownersCommand]
  ).execute();
}
