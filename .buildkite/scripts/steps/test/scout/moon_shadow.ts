/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Computes Moon's affected modules and config selection for comparison only.
 * Swallows Moon failures and returns `null` without changing CI selection.
 * See `affected-packages/README.md`.
 */

import { expandWithImplicitConsumers } from './scout_implicit_consumers.ts';
import type { ScoutLog } from './scout_log.ts';
import { getAffectedProjectsMoon, queryMoonTestSelection } from '#pipeline-utils';

export interface MoonShadowResult {
  mergeBase: string;
  affectedModules: string[];
  diffFromGit: {
    onlyInGit: string[];
    onlyInMoon: string[];
  };
  scoutTasks: {
    modeledConfigs: string[];
    affectedConfigs: string[];
  };
}

export function computeMoonShadow({
  mergeBase,
  gitChangedFiles,
  gitAffectedModules,
  log,
}: {
  mergeBase: string;
  gitChangedFiles: readonly string[];
  gitAffectedModules: ReadonlySet<string>;
  log: ScoutLog;
}): MoonShadowResult | null {
  try {
    const moonAffectedModules = expandWithImplicitConsumers(
      getAffectedProjectsMoon(mergeBase, true),
      gitChangedFiles,
      log
    );
    const scoutTaskSelection = queryMoonTestSelection([...gitChangedFiles], 'scout-tests');

    const onlyInGit = [...gitAffectedModules].filter((m) => !moonAffectedModules.has(m)).sort();
    const onlyInMoon = [...moonAffectedModules].filter((m) => !gitAffectedModules.has(m)).sort();

    if (onlyInGit.length > 0 || onlyInMoon.length > 0) {
      log.warning(
        `Selective testing shadow mode: git/moon affected-modules mismatch — ` +
          `onlyInGit=[${onlyInGit.join(', ')}] onlyInMoon=[${onlyInMoon.join(', ')}]`
      );
    } else {
      log.info('Selective testing shadow mode: git and moon affected-modules match');
    }

    return {
      mergeBase,
      affectedModules: [...moonAffectedModules].sort(),
      diffFromGit: { onlyInGit, onlyInMoon },
      scoutTasks: {
        modeledConfigs: [...scoutTaskSelection.modeledConfigs].sort(),
        affectedConfigs: [...scoutTaskSelection.affectedConfigs].sort(),
      },
    };
  } catch (error) {
    log.warning(
      `Selective testing shadow mode: Moon comparison failed, skipping (${
        error instanceof Error ? error.message : String(error)
      })`
    );
    return null;
  }
}
