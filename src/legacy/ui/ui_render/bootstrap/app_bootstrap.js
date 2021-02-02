/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Handlebars from 'handlebars';
import { createHash } from 'crypto';
import { readFile } from 'fs';
import { resolve } from 'path';

import { kbnBundlesLoaderSource } from './kbn_bundles_loader_source';

export class AppBootstrap {
  constructor({ templateData }) {
    this.templateData = { ...templateData, kbnBundlesLoaderSource };
    this._rawTemplate = undefined;
  }

  async getJsFile() {
    if (!this._rawTemplate) {
      this._rawTemplate = await loadRawTemplate();
    }

    const template = Handlebars.compile(this._rawTemplate, {
      knownHelpersOnly: true,
      noEscape: true, // this is a js file, so html escaping isn't appropriate
      strict: true,
    });

    return template(this.templateData);
  }

  async getJsFileHash() {
    const fileContents = await this.getJsFile();
    const hash = createHash('sha1');
    hash.update(fileContents);
    return hash.digest('hex');
  }
}

function loadRawTemplate() {
  const templatePath = resolve(__dirname, 'template.js.hbs');
  return readFileAsync(templatePath);
}

function readFileAsync(filePath) {
  return new Promise((resolve, reject) => {
    readFile(filePath, 'utf8', (err, fileContents) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(fileContents);
    });
  });
}
