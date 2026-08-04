/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import { computeGeneratedFiles } from '@kbn/connector-specs/codegen';

import type { GenerateCommand } from '../generate_command';

export const ConnectorRegistriesCommand: GenerateCommand = {
  name: 'connector-registries',
  description:
    'Regenerate all_specs.ts and connector_icons_map.ts in @kbn/connector-specs from src/specs/',
  usage: 'node scripts/generate connector-registries [--check]',
  flags: {
    boolean: ['check'],
    help: `
      --check   Verify the generated files are already up to date without writing (used by CI)
    `,
  },
  async run({ log, flags }) {
    const { entries, files } = await computeGeneratedFiles();

    if (flags.check) {
      const stale = files.filter(({ path, content }) => readFileSync(path, 'utf8') !== content);
      if (stale.length > 0) {
        throw createFailError(
          `The following generated file(s) are out of date with src/specs/:\n` +
            stale.map(({ path }) => `  - ${Path.relative(REPO_ROOT, path)}`).join('\n') +
            `\n\nRun this command without --check to regenerate them, then commit the result.`
        );
      }
      log.success(`Up to date: ${entries.length} connectors registered.`);
      return;
    }

    for (const { path, content } of files) {
      writeFileSync(path, content);
    }
    log.success(
      `Regenerated all_specs.ts and connector_icons_map.ts (${entries.length} connectors).`
    );
  },
};
