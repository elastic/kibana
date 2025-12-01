/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** ***********************************************************
 *
 *  Run `node scripts/es_archiver --help` for usage information
 *
 *************************************************************/

import Path from 'path';
import Url from 'url';
import readline from 'readline';
import Fs from 'fs';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FlagsReader, RunWithCommands } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';



export function runCli() {
  new RunWithCommands({
    description: 'CLI to help with enzyme migration',
    globalFlags: {
      string: [],
      help: `
        
      `,
    },
    async extendContext({ log, flags, addCleanupTask, statsMeta }) {
      
    },
  })
    .command({
      name: 'find-enzyme-files',
      usage: '',
      description: `
        
      `,
      flags: {
        
      },
      async run({ flags, statsMeta, log }) {
        const { execSync } = require('child_process');
        const path = require('path');

        // Search for files containing enzyme imports or usage
        const grepCommand = `git grep -l "from 'enzyme'" ":(exclude)node_modules/" || true`;
        const grepCommand2 = `git grep -l "from '@kbn/test/enzyme'" ":(exclude)node_modules/" || true`;
        
        try {
          // Execute grep commands and split results into arrays
          const files1 = execSync(grepCommand, { encoding: 'utf-8' }).split('\n').filter(Boolean);
          const files2 = execSync(grepCommand2, { encoding: 'utf-8' }).split('\n').filter(Boolean);
          
          // Combine and dedupe results
          const allFiles = [...new Set([...files1, ...files2])];

          if (allFiles.length === 0) {
            log.info('No files using enzyme were found');
            return;
          }

          log.info(`Found ${allFiles.length} files using enzyme:`);

          const { getOwningTeamsForPath } = require('@kbn/code-owners');

          // Track owners and their file/test/line counts
          type OwnerStats = {
            fileCount: number;
            testCount: number;
            lineCount: number;
          };
          const ownerStats: Record<string, OwnerStats> = {};

          // Get owners and test counts for each file
          for (const file of allFiles) {
            log.info(`- ${file}`);

            // Count test cases and lines in the file
            const fileContent = Fs.readFileSync(file, 'utf-8');
            const testCount = (fileContent.match(/(?:it|test|describe)\s*\(/g) || []).length;
            const lineCount = fileContent.split('\n').length;

            const owners = getOwningTeamsForPath(file);
            owners.forEach(owner => {
              if (!ownerStats[owner]) {
                ownerStats[owner] = { fileCount: 0, testCount: 0, lineCount: 0 };
              }
              ownerStats[owner].fileCount += 1;
              ownerStats[owner].testCount += testCount;
              ownerStats[owner].lineCount += lineCount;
            });
          }

          log.info('\nBreakdown by code owner:');
          Object.entries(ownerStats)
            .sort(([, a], [, b]) => b.testCount - a.testCount) // Sort by test count descending
            .forEach(([owner, stats]) => {
              log.info(`${owner}: ${stats.fileCount} files, ${stats.testCount} tests, ${stats.lineCount} lines`);
            });

        } catch (error) {
          throw createFlagError(`Failed to search for enzyme files: ${error.message}`);
        }
      },
    })
    .execute();
}

