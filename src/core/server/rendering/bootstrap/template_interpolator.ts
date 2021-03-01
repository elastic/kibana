/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const templateFileName = 'bootstrap.js.template.hbs';

export interface BootstrapTemplateData {
  themeTag: string;
  jsDependencyPaths: string[];
  publicPathMap: string;
}

export class BootstrapTemplateInterpolator {
  private template?: TemplateDelegate;

  async interpolate(templateData: BootstrapTemplateData) {
    const template = this.template ?? (await this.loadTemplate());
    return template(templateData);
  }

  private async loadTemplate() {
    const templatePath = resolve(__dirname, templateFileName);
    const rawTemplate = await readFile(templatePath, { encoding: 'utf-8' });
    this.template = Handlebars.compile(rawTemplate, {
      knownHelpersOnly: true,
      noEscape: true, // this is a js file, so html escaping isn't appropriate
      strict: true,
    });
    return this.template;
  }
}
