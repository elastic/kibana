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

const OAS_OUTPUT_DIR = path.resolve(REPO_ROOT, './oas_docs');

run(
  async ({ log, flagsReader }) => {
    const serverless = flagsReader.boolean('serverless');
    const traditional = flagsReader.boolean('traditional');
    if (!serverless && !traditional) {
      log.error(
        'Not capturing any OAS, remove one or both of `--no-serverless` or `--no-traditional` flags to run this CLI'
      );
      process.exit(1);
    }

    const update = flagsReader.boolean('update');
    const pathStartsWith = flagsReader.arrayOfStrings('include-path');
    const excludePathsMatching = flagsReader.arrayOfStrings('exclude-path') ?? [];

    if (traditional) {
      log.info('Capturing OAS for traditional Kibana...');
      await captureOasSnapshot({
        log,
        buildFlavour: 'traditional',
        outputFile: path.resolve(OAS_OUTPUT_DIR, 'bundle.json'),
        filters: { pathStartsWith, excludePathsMatching },
        update,
      });
      log.success('Captured OAS for traditional Kibana.');
    }

    if (serverless) {
      log.info('Capturing OAS for serverless Kibana...');
      await captureOasSnapshot({
        log,
        buildFlavour: 'serverless',
        outputFile: path.resolve(OAS_OUTPUT_DIR, 'bundle.serverless.json'),
        filters: { pathStartsWith, excludePathsMatching },
        update,
      });
      log.success('Captured OAS for serverless Kibana.');
    }
  },
  {
    description: `
      Get the current OAS from Kibana's /api/oas API
    `,
    flags: {
      boolean: ['update', 'serverless', 'traditional'],
      string: ['include-path', 'exclude-path'],
      default: {
        fix: false,
        serverless: true,
        traditional: true,
      },
      help: `
        --include-path            Path to include. Path must start with provided value. Can be passed multiple times.
        --exclude-path            Path to exclude. Path must NOT start with provided value. Can be passed multiple times.
        --update                  Write the current OAS bundles to ${chalk.cyan(OAS_OUTPUT_DIR)}.
        --no-serverless           Whether to skip OAS for serverless Kibana. Defaults to false.
        --no-traditional          Whether to skip OAS for traditional Kibana. Defaults to false.
      `,
    },
  }
);
