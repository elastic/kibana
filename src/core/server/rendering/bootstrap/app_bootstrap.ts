/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars from 'handlebars';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

interface BootstrapTemplateData {
  themeTag: string;
  jsDependencyPaths: string[];
  styleSheetPaths: string[];
  publicPathMap: string;
}

export class AppBootstrap {
  private rawTemplate?: string;

  constructor(private readonly templateData: BootstrapTemplateData) {}

  async getJsFile() {
    if (!this.rawTemplate) {
      this.rawTemplate = await loadRawTemplate();
    }

    const template = Handlebars.compile(this.rawTemplate, {
      knownHelpersOnly: true,
      noEscape: true, // this is a js file, so html escaping isn't appropriate
      strict: true,
    });

    return template(this.templateData);
  }

  getJsFileHash(fileContent: string) {
    const hash = createHash('sha1');
    hash.update(fileContent);
    return hash.digest('hex');
  }
}

const loadRawTemplate = async () => {
  const templatePath = resolve(__dirname, 'template.js.hbs');
  return await readFile(templatePath, { encoding: 'utf-8' });
};
