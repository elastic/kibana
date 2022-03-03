/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import globby from 'globby';

// @ts-ignore
import { testMatch } from '../../../jest-preset';

export const CONFIG_NAMES = {
  unit: 'jest.config.js',
  integration: 'jest.integration.config.js',
};

export class JestConfigs {
  cwd: string;
  roots: string[];
  allFiles: string[] | undefined;

  constructor(cwd: string, roots: string[]) {
    this.cwd = cwd;
    this.roots = roots;
  }

  async files(type: 'unit' | 'integration') {
    if (!this.allFiles) {
      this.allFiles = await globby(testMatch, {
        gitignore: true,
        cwd: this.cwd,
      });
    }

    return this.allFiles.filter((f) =>
      type === 'integration' ? f.includes('integration_tests') : !f.includes('integration_tests')
    );
  }

  async expected(type: 'unit' | 'integration') {
    const filesForType = await this.files(type);
    const directories: Set<string> = new Set();

    filesForType.forEach((file) => {
      const root = this.roots.find((r) => file.startsWith(r));

      if (root) {
        const splitPath = file.substring(root.length).split(path.sep);

        if (splitPath.length > 2) {
          const name = splitPath[1];
          directories.add([root, name].join(path.sep));
        }
      } else {
        throw new Error(
          `Test file (${file}) can not exist outside roots (${this.roots.join(
            ', '
          )}). Move it to a root or configure additional root.`
        );
      }
    });

    return [...directories].map((d) => [d, CONFIG_NAMES[type]].join(path.sep));
  }

  async existing(type: 'unit' | 'integration') {
    return await globby(`**/${CONFIG_NAMES[type]}`, {
      gitignore: true,
      cwd: this.cwd,
    });
  }

  async missing(type: 'unit' | 'integration') {
    const expectedConfigs = await this.expected(type);
    const existingConfigs = await this.existing(type);
    return await expectedConfigs.filter((x) => !existingConfigs.includes(x));
  }

  async allMissing() {
    return (await this.missing('unit')).concat(await this.missing('integration'));
  }
}
