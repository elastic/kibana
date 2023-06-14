/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { AUTOCOMPLETE_DEFINITIONS_FOLDER } from '@kbn/console-plugin/common/constants';
import { generateConsoleDefinitions } from './generate_console_definitions';

export function runGenerateConsoleDefinitionsCli() {
  run(
    (context) => {
      const { log, flags } = context;
      log.info('starting console definitions generation');
      log.info(flags);
      const { source, dest } = flags;
      if (!source) {
        throw createFlagError(`Missing --source argument`);
      }
      let definitionsFolder = Path.resolve(REPO_ROOT, `${dest}`);
      if (!dest) {
        definitionsFolder = Path.resolve(AUTOCOMPLETE_DEFINITIONS_FOLDER, 'generated');
      }
      const specsRepo = Path.resolve(`${source}`);
      generateConsoleDefinitions({ specsRepo, definitionsFolder });
      log.info('completed console definitions generation');
    },
    {
      flags: {
        string: ['source', 'dest'],
        help: `
    --source        Folder containing the root of the Elasticsearch specification repo
    --dest          Folder where console autocomplete definitions will be generated (relative to the Kibana repo root)
  `,
      },
    }
  );
}
