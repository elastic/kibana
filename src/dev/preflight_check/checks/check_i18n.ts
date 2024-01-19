/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { merge } from 'lodash';
import { dirname, resolve } from 'path';
import chalk from 'chalk';
import { extractUntrackedMessagesTask } from '../../i18n/tasks/extract_untracked_translations';
import {
  assignConfigFromPath,
  ErrorReporter,
  extractMessagesFromPathToMap,
  filterConfigPaths,
  I18nConfig,
  integrateLocaleFiles,
} from '../../i18n';
import { PreflightCheck, TestResponse } from './preflight_check';
import { getI18nIdentifierFromFilePath } from '../utils/get_i18n_identifier_from_file_path';

export class I18nCheck extends PreflightCheck {
  id = 'i18n';

  public async runCheck() {
    const files = Array.from(this.files.values());
    const response: TestResponse = { test: this.id, errors: [] };

    if (files.length === 0) {
      return response;
    }

    const reporter = new ErrorReporter();

    const paths = files.map(({ path }) => ({ path, i18nId: getI18nIdentifierFromFilePath(path) }));
    console.log('paths', paths);
    const kibanaRC = resolve(REPO_ROOT, '.i18nrc.json');
    const xpackRC = resolve(REPO_ROOT, 'x-pack/.i18nrc.json');

    const configs = await Promise.all(
      [kibanaRC, xpackRC].map((configPath) => assignConfigFromPath(undefined, configPath))
    );

    const config: I18nConfig = merge({}, ...configs);

    const filteredConfigPaths = Object.entries(config.paths).reduce((acc, [key, value]) => {
      if (typeof value === 'string' && paths.find(({ path }) => path.includes(value))) {
        acc[key] = value;
      }

      if (
        typeof value === 'object' &&
        Array.isArray(value) &&
        value.find((val) => paths.find(({ path }) => path.includes(val)))
      ) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string[]>);

    const newConfig = { ...config, paths: filteredConfigPaths };

    for (const { path } of paths) {
      await extractUntrackedMessagesTask({ path: dirname(path), config: newConfig, reporter });
    }

    const filteredPaths = filterConfigPaths(
      paths.map(({ path }) => path),
      newConfig
    ) as string[];
    if (filteredPaths.length === 0) {
      this.log.error(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} None of input paths is covered by the mappings in .i18nrc.json.`
      );
    }

    const messages = new Map<string, { message: string }>();

    for (const filteredPath of filteredPaths) {
      // Return result if no new errors were reported for this path.
      await extractMessagesFromPathToMap(dirname(filteredPath), messages, newConfig, reporter);
    }

    for (const translation of newConfig.translations) {
      await integrateLocaleFiles(messages, {
        dryRun: true,
        ignoreIncompatible: true,
        ignoreUnused: false,
        ignoreMissing: true,
        filterOnPath: paths.map(({ i18nId }) => i18nId),
        ignoreMalformed: true,
        sourceFileName: translation,
        targetFileName: this.flags.fix ? translation : undefined,
        config: newConfig,
        log: this.log,
      });
    }

    return response;
  }
}
