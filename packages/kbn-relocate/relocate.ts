/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { existsSync } from 'fs';
import { rename, mkdir, rm } from 'fs/promises';
import inquirer from 'inquirer';
import { sortBy } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Package, PullRequest } from './types';
import { DESCRIPTION, EXCLUDED_MODULES, KIBANA_FOLDER, NEW_BRANCH } from './constants';
import {
  belongsTo,
  calculateModuleTargetFolder,
  isInTargetFolder,
  replaceReferences,
  replaceRelativePaths,
} from './utils/relocate';
import { safeExec } from './utils/exec';
import { relocatePlan, relocateSummary } from './utils/logging';
import {
  checkoutBranch,
  checkoutResetPr,
  cherryPickManualCommits,
  findGithubLogin,
  findPr,
  findRemoteName,
  getManualCommits,
} from './utils/git';

const SKIP_RESET = false;

const moveModule = async (module: Package, log: ToolingLog) => {
  const destination = calculateModuleTargetFolder(module);
  log.info(`Moving ${module.directory} to ${destination}`);
  const chunks = destination.split('/');
  chunks.pop(); // discard module folder
  if (existsSync(destination)) {
    await rm(destination, { recursive: true });
  }
  await mkdir(join('/', ...chunks), { recursive: true });
  await rename(module.directory, destination);
  await replaceReferences(module, destination, log);
  await replaceRelativePaths(module, destination, log);
};

const relocateModules = async (toMove: Package[], log: ToolingLog): Promise<number> => {
  let relocated: number = 0;

  // filter out modules that are not categorised (lacking group, visibility)
  toMove = toMove.filter(
    (module) => module.group && module.group !== 'common' && module.visibility
  );

  for (let i = 0; i < toMove.length; ++i) {
    const module = toMove[i];

    log.info('');
    log.info('--------------------------------------------------------------------------------');
    log.info(`\t${module.id} (${i + 1} of ${toMove.length})`);
    log.info('--------------------------------------------------------------------------------');
    await moveModule(module, log);

    // after move operations
    await safeExec('yarn kbn bootstrap');
    await safeExec('node scripts/build_plugin_list_docs');
    await safeExec('node scripts/generate codeowners');
    await safeExec('node scripts/lint_packages --fix');
    await safeExec('node scripts/eslint --no-cache --fix');
    await safeExec('node scripts/precommit_hook --fix');

    // single commit per module now
    await safeExec(`git add .`);
    await safeExec(`git commit --no-verify -m "Relocating module \\\`${module.id}\\\`"`);
    ++relocated;
  }
  return relocated;
};

interface FindModulesParams {
  teams: string[];
  paths: string[];
  included: string[];
  excluded: string[];
}

export interface RelocateModulesParams {
  baseBranch: string;
  prNumber?: string;
  teams: string[];
  paths: string[];
  included: string[];
  excluded: string[];
}

const findModules = ({ teams, paths, included, excluded }: FindModulesParams, log: ToolingLog) => {
  // get all modules
  const modules = getPackages(REPO_ROOT);
  const moduleFilters = teams.length > 0 || paths.length > 0 || included.length > 0;

  // find modules selected by user filters
  return (
    sortBy(modules, ['directory'])
      // explicit exclusions
      .filter(({ id }) => !EXCLUDED_MODULES.includes(id) && !excluded.includes(id))
      // we don't want to move test and example modules (just yet)
      .filter(
        ({ directory }) =>
          !directory.includes(`/${KIBANA_FOLDER}/test/`) &&
          !directory.includes(`/${KIBANA_FOLDER}/x-pack/test/`) &&
          !directory.includes(`/${KIBANA_FOLDER}/examples/`) &&
          !directory.includes(`/${KIBANA_FOLDER}/x-pack/examples/`)
      )
      // the module is under the umbrella specified by the user
      .filter(
        (module) =>
          !moduleFilters ||
          included.includes(module.id) ||
          teams.some((team) => belongsTo(module, team)) ||
          paths.some((path) => module.directory.includes(path))
      )
      // the module is not explicitly excluded
      .filter(({ id }) => !excluded.includes(id))
      // exclude modules that don't define a group/visibility
      .filter((module) => {
        if (!module.group || module.group === 'common' || !module.visibility) {
          log.info(`The module ${module.id} does not specify 'group' or 'visibility'. Skipping`);
          return false;
        } else {
          return true;
        }
      })
      // exclude modules that are in the correct folder
      .filter((module) => {
        if (isInTargetFolder(module)) {
          log.info(
            `The module ${
              module.id
            } is already in the correct folder: '${calculateModuleTargetFolder(module)}'. Skipping`
          );
          return false;
        } else {
          return true;
        }
      })
  );
};

export const findAndMoveModule = async (moduleId: string, log: ToolingLog) => {
  const modules = findModules({ teams: [], paths: [], included: [moduleId], excluded: [] }, log);
  if (!modules.length) {
    log.warning(`Cannot move ${moduleId}, either not found or not allowed!`);
  } else {
    await moveModule(modules[0], log);
  }
};

export const findAndRelocateModules = async (params: RelocateModulesParams, log: ToolingLog) => {
  const { prNumber, baseBranch, ...findParams } = params;
  let pr: PullRequest | undefined;

  const upstream = await findRemoteName('elastic/kibana');
  if (!upstream) {
    log.error(
      'This repository does not have a remote pointing to the elastic/kibana repository. Aborting'
    );
    return;
  }

  const origin = await findRemoteName(`${await findGithubLogin()}/kibana`);
  if (!origin) {
    log.error('This repository does not have a remote pointing to your Kibana fork. Aborting');
    return;
  }

  if (!SKIP_RESET) {
    if (prNumber) {
      pr = await findPr(prNumber);

      if (getManualCommits(pr.commits).length > 0) {
        const resOverride = await inquirer.prompt({
          type: 'confirm',
          name: 'overrideManualCommits',
          message:
            'Manual commits detected in the PR. The script will try to cherry-pick them, but it might require manual intervention to resolve conflicts. Continue?',
        });
        if (!resOverride.overrideManualCommits) {
          log.info('Aborting');
          return;
        }
      }
    }

    const resConfirmReset = await inquirer.prompt({
      type: 'confirm',
      name: 'confirmReset',
      message: `The script will RESET CHANGES in this repository. Proceed?`,
    });

    if (!resConfirmReset.confirmReset) {
      log.info('Aborting');
      return;
    }

    // start with a clean repo
    await safeExec(`git restore --staged .`);
    await safeExec(`git restore .`);
    await safeExec(`git clean -f -d`);
    await safeExec(`git checkout ${baseBranch} && git pull ${upstream} ${baseBranch}`);

    if (pr) {
      // checkout existing PR, reset all commits, rebase from baseBranch
      try {
        await checkoutResetPr(pr, baseBranch);
      } catch (error) {
        log.error(`Error checking out / resetting PR #${prNumber}:`);
        log.error(error);
        return;
      }
    } else {
      // checkout new branch
      await checkoutBranch(NEW_BRANCH);
    }

    await safeExec(`yarn kbn bootstrap`);
  }
  await inquirer.prompt({
    type: 'confirm',
    name: 'readyRelocate',
    message: `Ready to relocate! You can commit changes previous to the relocation at this point. Confirm to proceed with the relocation`,
  });

  const toMove = findModules(findParams, log);
  if (!toMove.length) {
    log.info(
      `No packages match the specified filters. Please tune your '--path' and/or '--team' and/or '--include' flags`
    );
    return;
  }

  relocatePlan(toMove, log);

  const resConfirmPlan = await inquirer.prompt({
    type: 'confirm',
    name: 'confirmPlan',
    message: `The script will relocate the modules above and update references. Proceed?`,
  });

  if (!resConfirmPlan.confirmPlan) {
    log.info('Aborting');
    return;
  }

  // relocate modules
  const movedCount = await relocateModules(toMove, log);

  if (movedCount === 0) {
    log.warning(
      'No modules were relocated, aborting operation to prevent force-pushing empty changes'
    );
    return;
  }

  relocateSummary(log);

  if (pr) {
    await cherryPickManualCommits(pr, log);
  }

  // push changes in the branch
  const resPushBranch = await inquirer.prompt({
    type: 'confirm',
    name: 'pushBranch',
    message: `Relocation finished! You can commit extra changes at this point. Confirm to proceed pushing the current branch`,
  });

  const pushCmd = prNumber
    ? `git push --force-with-lease`
    : `git push --set-upstream ${origin} ${NEW_BRANCH}`;

  if (!resPushBranch.pushBranch) {
    log.info(`Remember to push changes with "${pushCmd}"`);
    return;
  }
  await safeExec(pushCmd);

  if (prNumber) {
    await safeExec(`gh pr edit ${prNumber} -F ${DESCRIPTION} -R elastic/kibana`);
    log.info(`Access the PR at: https://github.com/elastic/kibana/pull/${prNumber}`);
  } else {
    log.info('TIP: Run the following command to quickly create a PR:');
    log.info(
      `$ gh pr create -d -B "${baseBranch}" -t "<title>" -F ${DESCRIPTION} -R elastic/kibana`
    );
  }
};
