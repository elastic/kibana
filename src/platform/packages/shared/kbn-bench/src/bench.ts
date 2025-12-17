/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { IWorkspace } from '@kbn/workspaces';
import { activateWorktreeOrUseSourceRepo } from '@kbn/workspaces';
import { collectAndRun } from './collect_and_run';
import { collectAndRunForRightHandSide } from './collect_and_run_for_right_hand_side';
import { getGlobalConfig } from './config/get_global_config';
import type { GlobalBenchConfig } from './config/types';
import { getDefaultDataDir } from './filesystem/get_default_data_dir';
import { reportDiffTerminal } from './report/terminal/report_diff_terminal';
import { reportSingleTerminal } from './report/terminal/report_single_terminal';
import type { GlobalRunContext } from './types';
import { writeResults } from './write_results';

export async function bench({
  log,
  config: configGlob,
  left,
  right,
  profile,
  openProfile,
  grep,
  runs,
  configFromCwd,
}: {
  log: ToolingLog;
  config?: string | string[];
  left?: string;
  right?: string;
  profile?: boolean;
  openProfile?: boolean;
  grep?: string | string[];
  runs?: number;
  configFromCwd?: boolean;
}) {
  log.info(`Creating workspace for ${left || 'current working directory'}`);

  const leftWorkspace = await activateWorktreeOrUseSourceRepo({
    log,
    ref: left,
  });

  let rightWorkspace: IWorkspace | undefined;

  if (right) {
    log.info(`Creating workspace for ${right}`);

    rightWorkspace = await activateWorktreeOrUseSourceRepo({
      log,
      ref: right,
    });
  }

  const globalConfig = getGlobalConfig();
  const grepArray = Array.isArray(grep) ? grep : grep ? [grep] : undefined;
  const runtimeOverrides: Partial<GlobalBenchConfig> = {
    profile,
    openProfile,
    grep: grepArray,
    runs,
  };

  const globalRunContext: Omit<GlobalRunContext, 'workspace' | 'log'> = {
    dataDir: getDefaultDataDir(),
    globalConfig,
    runtimeOverrides,
  };

  const leftLog = log.withContext(leftWorkspace.getDisplayName());

  const leftContext: GlobalRunContext = {
    ...globalRunContext,
    workspace: leftWorkspace,
    log: leftLog,
  };

  leftLog.info(`Running benchmarks`);

  const leftResults = await collectAndRun({
    configGlob,
    context: leftContext,
    configFromCwd,
  });

  leftLog.info(`Completed benchmarks`);

  await writeResults(leftContext, leftResults);
  leftLog.debug(`Wrote results to disk`);

  if (!rightWorkspace) {
    log.debug('No right-hand side ref provided; reporting single-run results');
    log.info('\n' + reportSingleTerminal(leftResults));
    return;
  }

  leftLog.debug('\n' + reportSingleTerminal(leftResults));

  const rightLog = log.withContext(rightWorkspace.getDisplayName());

  const rightContext: GlobalRunContext = {
    ...globalRunContext,
    workspace: rightWorkspace,
    log: rightLog,
  };

  rightLog.info(`Running benchmarks`);

  const rightResults = await collectAndRunForRightHandSide({
    context: rightContext,
    leftResults,
    configFromCwd,
  });

  rightLog.info(`Completed benchmarks`);

  await writeResults(rightContext, rightResults);

  rightLog.debug(`Wrote results to disk`);

  rightLog.debug('\n' + reportSingleTerminal(leftResults));

  log.info(
    '\n' +
      reportDiffTerminal(
        {
          name: leftWorkspace.getDisplayName(),
          title: await leftWorkspace.getCommitLine(),
          results: leftResults,
        },
        {
          name: rightWorkspace.getDisplayName(),
          title: await rightWorkspace.getCommitLine(),
          results: rightResults,
        }
      )
  );
}
