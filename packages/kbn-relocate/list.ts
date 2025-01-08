/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortBy } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Package } from './types';
import { BASE_FOLDER, EXCLUDED_MODULES, KIBANA_FOLDER } from './constants';
import { calculateModuleTargetFolder, isInTargetFolder } from './utils/relocate';
import { createModuleTable } from './utils/logging';

export const listModules = async (listFlag: string, log: ToolingLog) => {
  // get all modules
  const modules = getPackages(REPO_ROOT);
  const devOnly: Package[] = [];
  const test: Package[] = [];
  const examples: Package[] = [];
  const uncategorised: Package[] = [];
  const incorrect: Package[] = [];
  const correct: Package[] = [];

  // find modules selected by user filters
  sortBy(modules, 'directory')
    // explicit exclusions
    .filter(({ id }) => !EXCLUDED_MODULES.includes(id))
    .forEach((module) => {
      if (module.isDevOnly()) {
        devOnly.push(module);
        return;
      }

      if (
        module.directory.includes(`/${KIBANA_FOLDER}/test/`) ||
        module.directory.includes(`/${KIBANA_FOLDER}/x-pack/test/`)
      ) {
        test.push(module);
        return;
      }

      if (
        module.directory.includes(`/${KIBANA_FOLDER}/examples/`) ||
        module.directory.includes(`/${KIBANA_FOLDER}/x-pack/examples/`)
      ) {
        examples.push(module);
        return;
      }

      if (!module.group || module.group === 'common' || !module.visibility) {
        // log.warning(`The module ${module.id} does not specify 'group' or 'visibility'. Skipping`);
        uncategorised.push(module);
        return;
      }

      if (!isInTargetFolder(module)) {
        incorrect.push(module);
        // log.warning(dedent`The module ${module.id} is not in the correct folder:
        //   - ${module.directory}
        //   - ${calculateModuleTargetFolder(module)}`);

        return;
      }
      correct.push(module);
    });

  if (listFlag === 'all') {
    log.info(
      createModuleTable(
        [
          [`${correct.length} modules are placed in a 'sustainable' folder`],
          [`${devOnly.length} modules are devOnly: true (use --list devOnly)`],
          [`${test.length} modules are in /test/ and /x-pack/test/ folders (use --list test)`],
          [
            `${examples.length} modules are in /examples/ and /x-pack/examples/ folders (use --list examples)`,
          ],
          [`${incorrect.length} modules are not in the correct folder (use --list incorrect)`],
          [`${uncategorised.length} modules are not categorised (use --list uncategorised)`],
        ],
        ['Summary']
      ).toString()
    );
  } else if (listFlag === 'devOnly') {
    log.info(
      createModuleTable(
        devOnly.map((module) => [module.id, module.directory.replace(BASE_FOLDER, '')]),
        ['Id', 'Current folder']
      ).toString()
    );
    log.info(`TOTAL: ${devOnly.length} modules`);
  } else if (listFlag === 'test') {
    log.info(
      createModuleTable(
        test.map((module) => [module.id, module.directory.replace(BASE_FOLDER, '')]),
        ['Id', 'Current folder']
      ).toString()
    );
    log.info(`TOTAL: ${test.length} modules`);
  } else if (listFlag === 'examples') {
    log.info(
      createModuleTable(
        examples.map((module) => [module.id, module.directory.replace(BASE_FOLDER, '')]),
        ['Id', 'Current folder']
      ).toString()
    );
    log.info(`TOTAL: ${examples.length} modules`);
  } else if (listFlag === 'incorrect') {
    log.info(
      createModuleTable(
        sortBy(
          incorrect.map((module) => [
            module.id,
            module.manifest.owner.join(', '),
            module.directory.replace(BASE_FOLDER, ''),
            calculateModuleTargetFolder(module).replace(BASE_FOLDER, ''),
          ]),
          ['1', '0']
        ),
        ['Id', 'Team', 'Current folder', 'Target folder']
      ).toString()
    );
    log.info(`TOTAL: ${incorrect.length} modules`);
  } else if (listFlag === 'uncategorised') {
    log.info(
      createModuleTable(
        uncategorised.map((module) => [
          module.id,
          `${module.directory.replace(BASE_FOLDER, '')}/kibana.jsonc`,
        ]),
        ['Id', 'Manifest']
      ).toString()
    );
    log.info(`TOTAL: ${uncategorised.length} modules`);
  }
};
