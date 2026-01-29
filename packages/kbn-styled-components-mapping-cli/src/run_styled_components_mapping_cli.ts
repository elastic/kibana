/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { findFiles } from './find_files';
import { generateRegexStringArray } from './generate_regex_array';
import { updateFile } from './update_file';

const mappingFilePath = 'packages/kbn-babel-preset/styled_components_files.js';
const mappingFileAbsolutePath = path.join(REPO_ROOT, mappingFilePath);

// Regex patterns to detect styled-components or emotion usage
const STYLED_COMPONENTS_IMPORT_REGEX =
  /import\s+(?:{[^{}]+}|.*?)\s*(?:from)?\s*['"](styled-components)['"]/;
const EMOTION_STYLED_IMPORT_REGEX =
  /import\s+(?:{[^{}]+}|.*?)\s*(?:from)?\s*['"](@emotion\/styled)['"]/;

/**
 * Check if any of the provided files contain styled-components or @emotion/styled imports.
 * This is a quick check to determine if we need to run the full scan.
 */
async function checkFilesForStyledImports(files: string[], log: any): Promise<boolean> {
  for (const file of files) {
    // Only check .ts and .tsx files
    if (!/\.tsx?$/.test(file)) {
      continue;
    }

    const absolutePath = path.isAbsolute(file) ? file : path.join(REPO_ROOT, file);

    if (!existsSync(absolutePath)) {
      continue;
    }

    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      if (
        STYLED_COMPONENTS_IMPORT_REGEX.test(content) ||
        EMOTION_STYLED_IMPORT_REGEX.test(content)
      ) {
        log.info(`Found styled-components/emotion import in ${file}`);
        return true;
      }
    } catch (err) {
      log.debug(`Could not read file ${file}: ${err}`);
    }
  }

  return false;
}

run(
  async ({ log, flagsReader }) => {
    // If specific files are provided, first check if any contain styled-components imports
    const filesArg = flagsReader.string('files');
    if (filesArg) {
      const filesToCheck = filesArg.split(',').filter(Boolean);
      if (filesToCheck.length > 0) {
        log.info(`Checking ${filesToCheck.length} file(s) for styled-components imports...`);
        const hasStyledImports = await checkFilesForStyledImports(filesToCheck, log);
        if (!hasStyledImports) {
          log.success('No styled-components imports in changed files. Mapping check skipped.');
          return;
        }
        log.info('Found styled-components imports. Running full mapping generation...');
      }
    }

    log.info(`Looking for source files importing 'styled-components'...`);

    const files = await findFiles(REPO_ROOT);
    const regexStringArray = generateRegexStringArray(files, REPO_ROOT);

    try {
      await updateFile(mappingFileAbsolutePath, regexStringArray);
    } catch (err) {
      createFailError(err);
    }

    log.info(`Generated ${mappingFilePath} with ${regexStringArray.length} regex expressions`);
  },
  {
    usage: `node scripts/styled_components_mapping`,
    description: 'Update styled-components babel mapping when converting styles to Emotion',
    flags: {
      string: ['files'],
      help: `
        --files     Comma-separated list of files to check for styled-components imports.
                    If provided and none contain styled imports, the full scan is skipped.
      `,
    },
  }
);
