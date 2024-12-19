/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { appendFileSync, writeFileSync } from 'fs';
import dedent from 'dedent';
import Table from 'cli-table3';
import type { Package } from '../types';
import { calculateModuleTargetFolder } from './relocate';
import {
  BASE_FOLDER,
  DESCRIPTION,
  GLOBAL_DESCRIPTION,
  SCRIPT_ERRORS,
  UPDATED_REFERENCES,
  UPDATED_RELATIVE_PATHS,
} from '../constants';

export const createModuleTable = (entries: string[][]) => {
  const table = new Table({
    head: ['Id', 'Target folder'],
    colAligns: ['left', 'left'],
    style: {
      'padding-left': 2,
      'padding-right': 2,
    },
  });

  table.push(...entries);
  return table;
};

export const relocatePlan = (modules: Package[], log: ToolingLog) => {
  const plugins = modules.filter((module) => module.manifest.type === 'plugin');
  const packages = modules.filter((module) => module.manifest.type !== 'plugin');

  const target = (module: Package) => calculateModuleTargetFolder(module).replace(BASE_FOLDER, '');
  writeFileSync(DESCRIPTION, GLOBAL_DESCRIPTION);

  if (plugins.length) {
    const pluginList = dedent`
    \n\n#### ${plugins.length} plugin(s) are going to be relocated:\n
    | Id | Target folder |
    | -- | ------------- |
    ${plugins.map((plg) => `| \`${plg.id}\` | \`${target(plg)}\` |`).join('\n')}
    \n\n`;

    appendFileSync(DESCRIPTION, pluginList);
    const plgTable = createModuleTable(plugins.map((plg) => [plg.id, target(plg)]));
    log.info(`${plugins.length} plugin(s) are going to be relocated:\n${plgTable.toString()}`);
  }

  if (packages.length) {
    const packageList = dedent`
    \n\n#### ${packages.length} packages(s) are going to be relocated:\n
    | Id | Target folder |
    | -- | ------------- |
    ${packages.map((pkg) => `| \`${pkg.id}\` | \`${target(pkg)}\` |`).join('\n')}
    \n\n`;

    appendFileSync(DESCRIPTION, packageList);
    const pkgTable = createModuleTable(packages.map((pkg) => [pkg.id, target(pkg)]));
    log.info(`${packages.length} packages(s) are going to be relocated:\n${pkgTable.toString()}`);
  }
};

export const appendCollapsible = (
  fileName: string,
  title: string,
  contents: string,
  open = false
) => {
  appendFileSync(
    fileName,
    dedent`
    <details ${open ? 'open' : ''}>
    <summary>${title}</summary>

    \`\`\`
    ${contents}
    \`\`\`

    </details>`
  );
};

export const relocateSummary = (log: ToolingLog) => {
  if (SCRIPT_ERRORS.length > 0) {
    const contents = SCRIPT_ERRORS.sort().join('\n');
    appendCollapsible(DESCRIPTION, 'Script errors', contents, true);
    log.warning(`Please address the following errors:\n${contents}`);
  }

  if (UPDATED_REFERENCES.size > 0) {
    const contents = Array.from(UPDATED_REFERENCES).sort().join('\n');
    appendCollapsible(DESCRIPTION, 'Updated references', contents);
    log.info(
      `The following files have been updated to replace references to modules:\n${contents}`
    );
  }

  if (UPDATED_RELATIVE_PATHS.size > 0) {
    const contents = Array.from(UPDATED_RELATIVE_PATHS)
      .sort()
      .map((ref) => ref.replace(BASE_FOLDER, ''))
      .join('\n');
    appendCollapsible(DESCRIPTION, 'Updated relative paths', contents);
    log.info(`The following files contain relative paths that have been updated:\n${contents}`);
  }
};
