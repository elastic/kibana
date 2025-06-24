/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import fs from 'fs';
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
      const { source, dest, emptyDest } = flags;
      if (!source) {
        throw createFlagError(`Missing --source argument`);
      }
      let definitionsFolder = Path.resolve(REPO_ROOT, `${dest}`);
      if (!dest) {
        definitionsFolder = Path.resolve(AUTOCOMPLETE_DEFINITIONS_FOLDER, 'generated');
      }
      log.info(`autocomplete definitions folder ${definitionsFolder}`);
      if (!fs.existsSync(definitionsFolder)) {
        log.warning(`folder ${definitionsFolder} doesn't exist, creating a new folder`);
        fs.mkdirSync(definitionsFolder, { recursive: true });
        log.warning(`created a new folder ${definitionsFolder}`);
      }
      const files = fs.readdirSync(definitionsFolder);
      if (files.length > 0) {
        if (!emptyDest) {
          throw createFlagError(
            `Definitions folder already contain files, use --emptyDest to clean the folder before generation`
          );
        }
        log.warning(`folder ${definitionsFolder} already contains files, emptying the folder`);
        for (const file of files) {
          fs.unlinkSync(Path.resolve(definitionsFolder, file));
        }
        log.warning(`folder ${definitionsFolder} has been emptied`);
      }

      const specsRepo = Path.resolve(`${source}`);
      if (!fs.existsSync(specsRepo)) {
        throw createFlagError(`ES specification folder ${specsRepo} doesn't exist`);
      }
      log.info(`ES specification repo folder ${source}`);
      generateConsoleDefinitions({ specsRepo, definitionsFolder, log });
      log.info('completed console definitions generation');
    },
    {
      description: `Generate Console autocomplete definitions from the ES specification repo`,
      usage: `
node scripts/generate_console_definitions.js --help
node scripts/generate_console_definitions.js --source <ES_SPECIFICATION_REPO>
node scripts/generate_console_definitions.js --source <ES_SPECIFICATION_REPO> [--dest <DEFINITIONS_FOLDER] [--emptyDest]
`,
      flags: {
        string: ['source', 'dest'],
        boolean: ['emptyDest'],
        help: `
--source        Folder containing the root of the Elasticsearch specification repo
--dest          Folder where console autocomplete definitions will be generated (relative to the Kibana repo root)
--emptyDest     Flag to empty definitions folder if it already contains any files
`,
      },
    }
  );
}
