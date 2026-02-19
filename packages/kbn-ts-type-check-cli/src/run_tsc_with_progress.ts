/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createInterface } from 'readline';
import execa from 'execa';
import { SingleBar } from 'cli-progress';
import stripAnsi from 'strip-ansi';
import type { SomeDevLog } from '@kbn/some-dev-log';

/**
 * Spawns `tsc -b --verbose` and drives a `cli-progress` bar by parsing the
 * per-project progress lines from tsc's verbose output.
 *
 * Progress is tracked by counting two kinds of tsc verbose messages:
 *   - "Building project '...'"       (project needs to be compiled)
 *   - "Project '...' is up to date"  (project skipped, already current)
 *
 * The total project count is extracted from the "Projects in this build:"
 * header that tsc prints at the very start of --verbose output.
 *
 * Error and diagnostic lines are buffered and replayed after the bar finishes.
 *
 * Returns `true` if tsc exited with code 0, `false` otherwise.
 */
export async function runTscWithProgress(options: {
  cmd: string;
  args: string[];
  env: Record<string, string>;
  cwd: string;
  type: string;
  log: SomeDevLog;
}): Promise<boolean> {
  const { cmd, args, env, cwd, log, type } = options;

  const child = execa(cmd, [...args, '--verbose'], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
    preferLocal: true,
    reject: false,
  });

  let totalProjects = 0;
  let completedProjects = 0;
  let builtProjects = 0;
  let skippedProjects = 0;
  let parsingProjectList = false;
  let barStarted = false;
  const errorLines: string[] = [];

  const startTime = Date.now();

  const formatElapsed = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
  };

  const bar = new SingleBar({
    barsize: 30,
    format:
      ' Type checking [{bar}] {value}/{total} projects | {elapsed} | {built} needed to be rechecked | Checking {project}',
    hideCursor: true,
    clearOnComplete: true,
  });

  const processLine = (line: string) => {
    const plain = stripAnsi(line);

    // Detect the project list header and count entries.
    // tsc --verbose output starts with:
    //   [HH:MM:SS] Projects in this build:
    //       * path/to/tsconfig.json
    //       * path/to/tsconfig2.json
    //   ...
    if (plain.includes('Projects in this build:')) {
      parsingProjectList = true;
      totalProjects = 0;
      return;
    }

    if (parsingProjectList) {
      if (/^\s+\*\s+/.test(plain)) {
        totalProjects++;
        return;
      }
      // First non-"*" line after the header ends the project list.
      parsingProjectList = false;

      if (totalProjects > 0 && !barStarted) {
        bar.start(totalProjects, 0, {
          elapsed: formatElapsed(),
          project: '',
          status: '',
          built: 0,
          skipped: 0,
        });
        barStarted = true;
      }
    }

    // Track per-project progress.
    const buildingMatch = plain.match(/Building project '([^']+)'/);
    if (buildingMatch) {
      completedProjects++;
      builtProjects++;
      if (barStarted) {
        bar.update(completedProjects, {
          elapsed: formatElapsed(),
          project: extractProjectName(buildingMatch[1]),
          status: 'checking',
          built: builtProjects,
          skipped: skippedProjects,
        });
      }
      return;
    }

    const upToDateMatch = plain.match(/Project '([^']+)' is up to date/);
    if (upToDateMatch) {
      completedProjects++;
      skippedProjects++;
      if (barStarted) {
        bar.update(completedProjects, {
          elapsed: formatElapsed(),
          project: extractProjectName(upToDateMatch[1]),
          status: 'cache hit - no rebuild needed',
          built: builtProjects,
          skipped: skippedProjects,
        });
      }
      return;
    }

    // Collect error / diagnostic lines (anything that isn't verbose noise).
    // Skip timestamp-only verbose lines that don't carry useful info.
    const trimmed = plain.trim();
    if (trimmed.length > 0 && !isVerboseNoise(trimmed)) {
      errorLines.push(line);
    }
  };

  // Read stdout and stderr line-by-line.
  if (child.stdout) {
    const rl = createInterface({ input: child.stdout });
    rl.on('line', processLine);
  }

  if (child.stderr) {
    const rl = createInterface({ input: child.stderr });
    rl.on('line', (line) => {
      errorLines.push(line);
    });
  }

  // Tick every second so the elapsed timer updates even when no projects are completing.
  const timer = setInterval(() => {
    if (barStarted) {
      bar.update({ elapsed: formatElapsed() });
    }
  }, 1000);

  const result = await child;

  clearInterval(timer);

  if (barStarted) {
    bar.update(totalProjects, { elapsed: formatElapsed() });
    bar.stop();
  }

  // Replay any error / diagnostic output so the user can see what went wrong.
  if (errorLines.length > 0) {
    for (const line of errorLines) {
      process.stdout.write(line + '\n');
    }
  }

  const elapsed = formatElapsed();

  if (result.killed || result.signal) {
    log.warning(
      `[${type}] Type check cancelled after ${elapsed} (${completedProjects}/${totalProjects} projects).`
    );
  } else if (result.exitCode === 0) {
    log.info(
      `[${type}] Type checked ${totalProjects} projects successfully in ${elapsed} (${builtProjects} built, ${skippedProjects} up-to-date).`
    );
  } else {
    log.error(
      `[${type}] Type check failed after ${elapsed} (${completedProjects}/${totalProjects} projects).`
    );
  }

  return result.exitCode === 0;
}

/**
 * Extract a short, human-friendly project name from a tsconfig path.
 *
 * Examples:
 *   "src/platform/packages/shared/kbn-std/tsconfig.type_check.json"  -> "kbn-std"
 *   "x-pack/solutions/observability/plugins/apm/tsconfig.type_check.json" -> "apm"
 *   "tsconfig.type_check.json" -> "tsconfig.type_check.json"
 */
const extractProjectName = (configPath: string): string => {
  const parts = configPath.replace(/\\/g, '/').split('/');
  // The directory immediately before the tsconfig file is the package/plugin name.
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return configPath;
};

/**
 * Returns true for tsc --verbose lines that are informational noise
 * (not errors, not progress). These are suppressed from output.
 */
const isVerboseNoise = (plain: string): boolean => {
  // Timestamp-prefixed verbose messages we want to hide
  if (/^\[?\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\]?\s/.test(plain)) {
    return true;
  }
  // The "Projects in this build:" header and list items
  if (plain.includes('Projects in this build:') || /^\s+\*\s+/.test(plain)) {
    return true;
  }
  return false;
};
