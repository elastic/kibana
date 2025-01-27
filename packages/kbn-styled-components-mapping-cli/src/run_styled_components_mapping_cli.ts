/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'node:path';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { findFiles } from './find_files';
import { generateRegexStringArray } from './generate_regex_array';
import { updateFile } from './update_file';

const mappingFilePath = 'packages/kbn-babel-preset/styled_components_files.js';
const mappingFileAbsolutePath = path.join(REPO_ROOT, mappingFilePath);

run(
  async ({ log }) => {
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
  }
);
