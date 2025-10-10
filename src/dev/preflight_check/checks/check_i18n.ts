/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge } from 'lodash';
import { dirname, resolve } from 'path';
import chalk from 'chalk';
import { REPO_ROOT } from '@kbn/repo-info';
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

    const paths = files.map(({ path }) => ({
      path,
      i18nId: getI18nIdentifierFromFilePath(path),
    }));

    const kibanaI18nrc = resolve(REPO_ROOT, '.i18nrc.json');
    const xpackI18nrc = resolve(REPO_ROOT, 'x-pack/.i18nrc.json');

    const configs = await Promise.all(
      [kibanaI18nrc, xpackI18nrc].map((configPath) => assignConfigFromPath(undefined, configPath))
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

    const configWithPathsForRelevantFiles = { ...config, paths: filteredConfigPaths };

    for (const { path } of paths) {
      await extractUntrackedMessagesTask({
        path: dirname(path),
        config: configWithPathsForRelevantFiles,
        reporter,
      });
    }

    // Checks if any of the input paths is covered by the mappings in .i18nrc.json
    const filteredPaths = filterConfigPaths(
      paths.map(({ path }) => path),
      config
    ) as string[];
    if (filteredPaths.length === 0) {
      this.log.error(
        `${chalk.white.bgRed(
          ' I18N ERROR '
        )} None of input paths is covered by the mappings in .i18nrc.json.`
      );
    }

    const uniqueAppRoots = paths.reduce((acc, { path }) => {
      const relativePathArray = path.includes('src')
        ? path.split('/').slice(0, 2)
        : path.split('/').slice(0, 3);

      const appRoot = `${REPO_ROOT}/${relativePathArray.join('/')}`;

      if (!acc.includes(appRoot)) {
        acc.push(appRoot);
      }
      return acc;
    }, [] as string[]);

    // Gets all i18n messages for the apps in the changed files set
    const messages = new Map<string, { message: string }>();
    for (const appRoot of uniqueAppRoots) {
      await extractMessagesFromPathToMap(
        appRoot,
        messages,
        configWithPathsForRelevantFiles,
        reporter
      );
    }

    for (const translation of configWithPathsForRelevantFiles.translations) {
      const error = await integrateLocaleFiles(messages, {
        dryRun: true,
        ignoreIncompatible: false,
        ignoreUnused: false,
        ignoreMissing: true,
        filterPerI18nId: [...new Set(paths.map(({ i18nId }) => i18nId))],
        ignoreMalformed: true,
        sourceFileName: translation,
        targetFileName: this.flags.fix ? translation : undefined,
        config: configWithPathsForRelevantFiles,
        log: this.log,
        returnErrorsInsteadOfThrow: true,
      });

      if (error) {
        response.errors.push(`${chalk.bold(translation)}: ${error}`);
      }
    }

    return response;
  }
}
