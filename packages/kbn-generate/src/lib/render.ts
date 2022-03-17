/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import Ejs from 'ejs';
import normalizePath from 'normalize-path';
import { ToolingLog, sortPackageJson } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

export type Vars = Record<string, unknown>;
export interface RenderContext extends Vars {
  /**
   * convert any serializable value into prett-printed JSON
   */
  json(arg: any): string;
  /**
   * convert string values into valid and pretty JS
   */
  js(arg: string): string;
  /**
   * create a normalized relative path from the generated files location to a repo-relative path
   */
  relativePathTo(rootRelativePath: string): string;
}

export class Render {
  jsonHelper: RenderContext['json'] = (arg) => JSON.stringify(arg, null, 2);
  jsHelper: RenderContext['js'] = (arg) => {
    if (typeof arg !== 'string') {
      throw new Error('js() only supports strings right now');
    }

    const hasSingle = arg.includes(`'`);
    const hasBacktick = arg.includes('`');

    if (!hasSingle) {
      return `'${arg}'`;
    }

    if (!hasBacktick) {
      return `\`${arg}\``;
    }

    return `'${arg.replaceAll(`'`, `\\'`)}'`;
  };

  constructor(private readonly log: ToolingLog) {}

  /**
   * Render an ejs template to a string
   */
  async toString(templatePath: string, destPath: string, vars: Vars) {
    const context: RenderContext = {
      ...vars,

      // helpers
      json: this.jsonHelper,
      js: this.jsHelper,
      relativePathTo: (rootRelativePath: string) =>
        normalizePath(
          Path.relative(Path.dirname(destPath), Path.resolve(REPO_ROOT, rootRelativePath))
        ),
    };

    this.log.debug('Rendering', templatePath, 'with context', context);
    const content = await Ejs.renderFile(templatePath, context);
    return Path.basename(destPath) === 'package.json' ? sortPackageJson(content) : content;
  }

  /**
   * Render an ejs template to a file
   */
  async toFile(templatePath: string, destPath: string, vars: Vars) {
    const content = await this.toString(templatePath, destPath, vars);
    this.log.debug('Writing to', destPath);
    return await Fsp.writeFile(destPath, content);
  }
}
