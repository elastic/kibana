/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'node:path';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import chalk from 'chalk';
import { captureOasSnapshot } from './capture_oas_snapshot';

export const sortAndPrettyPrint = (object: object) => {
  const keys = new Set<string>();
  JSON.stringify(object, (key, value) => {
    keys.add(key);
    return value;
  });
  return JSON.stringify(object, Array.from(keys).sort(), 2);
};

run(
  async ({ log, flagsReader }) => {
    const update = flagsReader.boolean('update');
    const serverless = flagsReader.boolean('serverless');
    const traditional = flagsReader.boolean('traditional');
    const pathStartsWith = flagsReader.arrayOfStrings('include-path');
    const excludePathsMatching = flagsReader.arrayOfStrings('exclude-path') ?? [];

    if (traditional) {
      await captureOasSnapshot({
        log,
        buildFlavour: 'serverless',
        outputFile: path.resolve(REPO_ROOT, './oas_docs/bundle.json'),
        filters: { pathStartsWith, excludePathsMatching },
        update,
      });
    }

    if (serverless) {
      await captureOasSnapshot({
        log,
        buildFlavour: 'serverless',
        outputFile: path.resolve(REPO_ROOT, './oas_docs/bundle.serverless.json'),
        filters: { pathStartsWith, excludePathsMatching },
        update,
      });
    }
  },
  {
    description: `
      Get the current OAS from Kibana's /api/oas API
    `,
    flags: {
      boolean: ['update'],
      string: ['include-path', 'exclude-path', 'build-flavor'],
      default: {
        fix: false,
        serverless: true,
        traditional: true,
      },
      help: `
        --include-path            Path to include. Path must start with provided value. Can be passed multiple times.
        --exclude-path            Path to exclude. Path must NOT start with provided value. Can be passed multiple times.
        --update                  Write the current OAS to ${chalk.cyan(OAS_FILE_PATH)}.
        --no-serverless           Whether to skip OAS for serverless Kibana. Defaults to false.
        --no-traditional          Whether to skip OAS for traditional Kibana. Defaults to false.
      `,
    },
  }
);
