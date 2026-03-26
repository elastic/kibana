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
import { extractPluginTranslations } from './extract_plugin_translations';

export function runExtractPluginTranslationsCli() {
  run(
    (context) => {
      const { log, flags } = context;
      log.info('Starting plugin translations extraction...');

      const outputDir = flags['output-dir'] as string;
      const startsWith = flags['starts-with'] as string;

      if (!outputDir) {
        throw createFlagError('Missing --output-dir argument');
      }

      if (!startsWith) {
        throw createFlagError('Missing --starts-with argument');
      }

      const outputPath = Path.resolve(REPO_ROOT, outputDir);

      if (!fs.existsSync(outputPath)) {
        log.info(`Creating output directory: ${outputPath}`);
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const sourceTranslationsDir = Path.resolve(
        REPO_ROOT,
        'x-pack/platform/plugins/private/translations/translations'
      );

      if (!fs.existsSync(sourceTranslationsDir)) {
        throw createFlagError(`Source translations directory not found: ${sourceTranslationsDir}`);
      }

      log.info(`Source translations directory: ${sourceTranslationsDir}`);
      log.info(`Output directory: ${outputPath}`);
      log.info(`Extracting messages starting with: ${startsWith}`);

      extractPluginTranslations({
        sourceDir: sourceTranslationsDir,
        outputDir: outputPath,
        keyPrefix: startsWith,
        log,
      });

      log.info('Successfully extracted plugin translations');
    },
    {
      description: 'Extract plugin-specific translation messages from Kibana translation files',
      usage: `
node scripts/extract_plugin_translations.js --help
node scripts/extract_plugin_translations.js --output-dir <OUTPUT_DIR> --starts-with <PREFIX>
`,
      flags: {
        string: ['output-dir', 'starts-with'],
        help: `
--output-dir     Directory where plugin-specific translations will be generated (relative to the Kibana repo root)
--starts-with    String prefix to match translation keys (e.g., "console." for console messages)
`,
      },
    }
  );
}
