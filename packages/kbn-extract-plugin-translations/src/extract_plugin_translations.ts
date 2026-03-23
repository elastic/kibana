/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';

interface TranslationFile {
  formats?: Record<string, any>;
  messages: Record<string, string>;
}

interface ExtractOptions {
  sourceDir: string;
  outputDir: string;
  keyPrefix: string;
  log: ToolingLog;
}

export function extractPluginTranslations({
  sourceDir,
  outputDir,
  keyPrefix,
  log,
}: ExtractOptions): void {
  const translationFiles = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json'));

  if (translationFiles.length === 0) {
    log.warning('No translation files found in source directory');
    return;
  }

  log.info(`Found ${translationFiles.length} translation files`);

  for (const fileName of translationFiles) {
    const sourcePath = Path.join(sourceDir, fileName);
    const outputPath = Path.join(outputDir, fileName);

    log.info(`Processing ${fileName}...`);

    try {
      const content = fs.readFileSync(sourcePath, 'utf8');

      if (fileName === 'en.json') {
        // en.json uses JavaScript object syntax (not strict JSON) and typically
        // doesn't contain plugin-specific translations as those are defined
        // directly in the source code
        log.info(`Skipping en.json (translations are in source code)`);
        continue;
      }

      const translationData: TranslationFile = JSON.parse(content);
      const messages = translationData.messages || translationData;
      const formats = translationData.formats || {};

      const filteredMessages: Record<string, string> = {};
      let messageCount = 0;

      for (const [key, value] of Object.entries(messages)) {
        if (key.startsWith(keyPrefix)) {
          filteredMessages[key] = value;
          messageCount++;
        }
      }

      const outputData: TranslationFile = {
        formats,
        messages: filteredMessages,
      };

      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      log.info(
        `Processed ${fileName}: extracted ${messageCount} messages with prefix "${keyPrefix}"`
      );
    } catch (error) {
      log.error(`Error processing ${fileName}: ${error}`);
    }
  }
}
