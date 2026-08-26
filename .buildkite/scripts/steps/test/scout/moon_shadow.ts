/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Computes Moon's affected-modules result for comparison against git —
 * observational only, never influences the actual selective-testing
 * decision. Swallows Moon failures and returns `null` instead of throwing.
 * See `affected-packages/README.md`.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { expandWithImplicitConsumers } from './scout_implicit_consumers';
import { getAffectedProjectsMoon } from '#pipeline-utils';

export interface MoonShadowResult {
  mergeBase: string;
  affectedModules: string[];
  diffFromGit: {
    onlyInGit: string[];
    onlyInMoon: string[];
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
  log: ToolingLog;
}): MoonShadowResult | null {
  try {
    const moonAffectedModules = expandWithImplicitConsumers(
      getAffectedProjectsMoon(mergeBase, true),
      gitChangedFiles,
      log
    );

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
