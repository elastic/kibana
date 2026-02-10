/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';
import { createInterface } from 'readline';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { type TsProject, TS_PROJECTS } from '@kbn/ts-projects';
import execa from 'execa';

import {
  updateRootRefsConfig,
  cleanupRootRefsConfig,
  ROOT_REFS_CONFIG_PATH,
} from './root_refs_config';
import { archiveTSBuildArtifacts } from './src/archive/archive_ts_build_artifacts';
import { restoreTSBuildArtifacts } from './src/archive/restore_ts_build_artifacts';
import { LOCAL_CACHE_ROOT } from './src/archive/constants';
import { isCiEnvironment } from './src/archive/utils';

const rel = (from: string, to: string) => {
  const path = Path.relative(from, to);
  return path.startsWith('.') ? path : `./${path}`;
};

/**
 * When using tsgo (TypeScript 7), paths values must be relative (prefixed with `./`)
 * since `baseUrl` has been removed. This function transforms a paths map accordingly.
 */
function makePathsRelative(
  paths: Record<string, string[]> | undefined
): Record<string, string[]> | undefined {
  if (!paths) return undefined;

  const result: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(paths)) {
    result[key] = values.map((v) => (v.startsWith('.') ? v : `./${v}`));
  }
  return result;
}

async function createTypeCheckConfigs(log: SomeDevLog, projects: TsProject[], useTsgo: boolean) {
  const writes: Array<[path: string, content: string]> = [];

  // write tsconfig.type_check.json files for each project that is not the root
  const queue = new Set(projects);
  for (const project of queue) {
    const config = project.config;
    const base = project.getBase();
    if (base) {
      queue.add(base);
    }

    const isBaseProject = project.repoRel === 'tsconfig.base.json';
    const paths = isBaseProject ? config.compilerOptions?.paths : undefined;

    const typeCheckConfig = {
      ...config,
      extends: base ? rel(project.directory, base.typeCheckConfigPath) : undefined,
      compilerOptions: {
        ...config.compilerOptions,
        // tsgo (TypeScript 7) has removed baseUrl — omit it when using tsgo
        baseUrl: useTsgo ? undefined : config.compilerOptions?.baseUrl,
        composite: true,
        rootDir: '.',
        noEmit: false,
        emitDeclarationOnly: true,
        paths: useTsgo ? makePathsRelative(paths) : paths,
      },
      kbn_references: undefined,
      references: project.getKbnRefs(TS_PROJECTS).map((refd) => {
        queue.add(refd);

        return {
          path: rel(project.directory, refd.typeCheckConfigPath),
        };
      }),
    };

    writes.push([project.typeCheckConfigPath, JSON.stringify(typeCheckConfig, null, 2)]);
  }

  return new Set(
    await asyncMapWithLimit(writes, 50, async ([path, content]) => {
      try {
        const existing = await Fsp.readFile(path, 'utf8');
        if (existing === content) {
          return path;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }

      log.verbose('updating', path);
      await Fsp.writeFile(path, content, 'utf8');
      return path;
    })
  );
}

/**
 * Patch @emotion/react type declarations so that tsgo can apply module augmentations
 * correctly. tsgo treats modules identified by different specifiers (e.g. `./index` vs
 * `@emotion/react`) as distinct, so the `declare module '@emotion/react'` augmentation
 * in typings/emotion.d.ts doesn't apply to the `Theme` imported via `./index` inside
 * @emotion/react's own declaration files. Changing the relative import to the package
 * specifier fixes this while remaining backward-compatible with tsc.
 */
async function patchEmotionTypesForTsgo(log: SomeDevLog) {
  const patches: Array<{ file: string; from: string; to: string }> = [
    {
      file: Path.resolve(REPO_ROOT, 'node_modules/@emotion/react/types/jsx-namespace.d.ts'),
      from: "import { Theme } from './index'",
      to: "import { Theme } from '@emotion/react'",
    },
    {
      file: Path.resolve(REPO_ROOT, 'node_modules/@emotion/react/types/css-prop.d.ts'),
      from: "import { Theme } from '.'",
      to: "import { Theme } from '@emotion/react'",
    },
  ];

  for (const patch of patches) {
    try {
      const content = await Fsp.readFile(patch.file, 'utf8');
      if (content.includes(patch.from)) {
        await Fsp.writeFile(patch.file, content.replace(patch.from, patch.to), 'utf8');
        log.verbose(`Patched ${Path.relative(REPO_ROOT, patch.file)} for tsgo compatibility`);
      }
    } catch (err) {
      log.warning(`Failed to patch ${patch.file}: ${err.message}`);
    }
  }
}

/**
 * Clean up stray .d.ts and .d.ts.map files that tsgo emits alongside source files.
 * This happens when composite project references pull in source files from packages
 * that are not set up as explicit project references — tsgo can't map those files
 * to an outDir so they end up next to the source. We detect them as untracked git
 * files and remove them after the build.
 */
async function cleanupStrayDeclarations(log: SomeDevLog) {
  try {
    const { stdout } = await execa(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--', '*.d.ts', '*.d.ts.map'],
      { cwd: REPO_ROOT }
    );

    const files = stdout.trim().split('\n').filter(Boolean);

    if (files.length > 0) {
      log.verbose(`Cleaning up ${files.length} stray declaration file(s) emitted by the build`);
      await asyncForEachWithLimit(files, 20, async (file) => {
        await Fsp.unlink(Path.resolve(REPO_ROOT, file));
      });
    }
  } catch {
    // ignore — git may not be available in some environments
  }
}

/**
 * Run tsgo/tsc with a live progress bar. Internally passes `--verbose` to
 * get "Building project" lines, parses them on the fly, and renders a
 * single-line progress indicator on stderr. Error output is collected and
 * printed after the build finishes.
 *
 * Returns `true` when the build fails (non-zero exit code).
 */
async function runWithProgress(
  cmd: string,
  args: string[],
  env?: Record<string, string>
): Promise<boolean> {
  // Ensure --verbose so we get per-project build lines
  const fullArgs = args.includes('--verbose') ? args : [...args, '--verbose'];

  const child = execa(cmd, fullArgs, {
    cwd: REPO_ROOT,
    reject: false,
    buffer: false,
    ...(env ? { env: { ...process.env, ...env } } : {}),
  });

  if (!child.stdout) {
    throw new Error('Failed to create stdout stream');
  }

  let totalProjects = 0;
  let processed = 0;
  let inProjectList = false;
  let currentProject = '';
  const errorOutput: string[] = [];
  const startTime = Date.now();
  const columns = process.stderr.columns || 120;

  // Strip ANSI escape codes for parsing
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

  function formatElapsed(): string {
    const totalSecs = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m${String(secs).padStart(2, '0')}s` : `${secs}s`;
  }

  function render() {
    if (totalProjects === 0) {
      const msg = `  Scanning projects… ${formatElapsed()}`;
      process.stderr.write(`\r${msg}${' '.repeat(Math.max(0, columns - msg.length))}`);
      return;
    }

    const pct = Math.min(100, Math.round((processed / totalProjects) * 100));
    const barWidth = 25;
    const filled = Math.round((pct / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);

    const short = currentProject.replace(/tsconfig\.type_check\.json$/, '').replace(/\/$/, '');

    const prefix = `  ${bar} ${String(pct).padStart(
      3
    )}% (${processed}/${totalProjects}) ${formatElapsed()} \u2014 `;
    const maxLen = columns - prefix.length;
    const display = short.length > maxLen ? '\u2026' + short.slice(-(maxLen - 1)) : short;

    const line = prefix + display;
    process.stderr.write(`\r${line}${' '.repeat(Math.max(0, columns - line.length))}`);
  }

  const rl = createInterface({ input: child.stdout });

  rl.on('line', (rawLine) => {
    const line = strip(rawLine).trim();
    if (!line) return;

    // --- Phase 1: count projects in the "Projects in this build:" list ---
    if (line.includes('Projects in this build:')) {
      inProjectList = true;
      return;
    }
    if (inProjectList) {
      if (line.startsWith('* ')) {
        totalProjects++;
        return;
      }
      inProjectList = false;
      render();
      // fall through — this line may be meaningful
    }

    // --- Phase 2: track build progress ---
    const buildMatch = line.match(/Building project '([^']+)'/);
    if (buildMatch) {
      processed++;
      currentProject = buildMatch[1];
      render();
      return;
    }

    if (line.match(/Project '[^']+' is up to date/)) {
      processed++;
      render();
      return;
    }

    // Skip informational verbose lines
    if (line.match(/is out of date because/) || line.match(/Updating .* timestamps/)) {
      return;
    }

    // --- Everything else is error / diagnostic output ---
    errorOutput.push(rawLine);
  });

  return new Promise<boolean>((resolve) => {
    child.on('exit', (code) => {
      // Clear the progress line
      process.stderr.write(`\r${' '.repeat(columns)}\r`);

      const elapsed = formatElapsed();

      if (errorOutput.length > 0) {
        for (const errLine of errorOutput) {
          process.stderr.write(errLine + '\n');
        }
        process.stderr.write('\n');
      }

      if (code === 0) {
        process.stderr.write(
          `  \u2714 Type check of ${totalProjects} projects passed in ${elapsed}\n`
        );
      } else {
        process.stderr.write(
          `  \u2716 Type check failed in ${elapsed} (${processed}/${totalProjects} projects processed)\n`
        );
      }

      resolve(code !== 0);
    });
  });
}

async function detectLocalChanges(): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
  });

  return stdout.trim().length > 0;
}

run(
  async ({ log, flagsReader, procRunner }) => {
    const shouldCleanCache = flagsReader.boolean('clean-cache');
    const shouldUseArchive = flagsReader.boolean('with-archive');

    if (shouldCleanCache) {
      await asyncForEachWithLimit(TS_PROJECTS, 10, async (proj) => {
        await Fsp.rm(Path.resolve(proj.directory, 'target/types'), {
          force: true,
          recursive: true,
          maxRetries: 3,
          retryDelay: 100,
        });
      });
      await Fsp.rm(LOCAL_CACHE_ROOT, {
        force: true,
        recursive: true,
        maxRetries: 3,
        retryDelay: 100,
      });
      log.warning('Deleted all TypeScript caches');
      return;
    }

    // if the tsconfig.refs.json file is not self-managed then make sure it has
    // a reference to every composite project in the repo
    await updateRootRefsConfig(log);

    if (shouldUseArchive && !shouldCleanCache) {
      await restoreTSBuildArtifacts(log);
    } else if (shouldCleanCache && shouldUseArchive) {
      log.info('Skipping TypeScript cache restore because --clean-cache was provided.');
    } else {
      log.verbose('Skipping TypeScript cache restore because --with-archive was not provided.');
    }

    const useTsgo = flagsReader.boolean('tsgo');
    const projectFilter = flagsReader.path('project');

    const projects = TS_PROJECTS.filter(
      (p) => !p.isTypeCheckDisabled() && (!projectFilter || p.path === projectFilter)
    );

    if (projectFilter && projects.length === 0) {
      throw createFailError(
        `No project found matching [${projectFilter}]. Make sure the path points to an existing tsconfig.json file.`
      );
    }

    const created = await createTypeCheckConfigs(log, projects, useTsgo);

    if (useTsgo) {
      await patchEmotionTypesForTsgo(log);
    }

    const showProgress = flagsReader.boolean('show-progress');

    const relative = Path.relative(
      REPO_ROOT,
      projects.length === 1 ? projects[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
    );

    const cmd = useTsgo
      ? Path.relative(
          REPO_ROOT,
          Path.join(
            Path.dirname(require.resolve('@typescript/native-preview/package.json')),
            'bin',
            'tsgo.js'
          )
        )
      : Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc'));

    const baseArgs = [
      '-b',
      relative,
      '--pretty',
      ...(flagsReader.boolean('verbose') ? ['--verbose'] : []),
      ...(flagsReader.boolean('extended-diagnostics') ? ['--extendedDiagnostics'] : []),
    ];

    let didTypeCheckFail = false;

    if (showProgress) {
      log.info('Starting type check with progress tracking…');
      didTypeCheckFail = await runWithProgress(
        cmd,
        baseArgs,
        useTsgo ? undefined : { NODE_OPTIONS: '--max-old-space-size=10240' }
      );
    } else {
      try {
        log.info(
          `Building TypeScript projects to check types (For visible, though excessive, progress info you can pass --verbose)`
        );

        await procRunner.run(useTsgo ? 'tsgo' : 'tsc', {
          cmd,
          args: baseArgs,
          // tsgo is a native Go binary — no need for Node.js memory limits
          ...(useTsgo ? {} : { env: { NODE_OPTIONS: '--max-old-space-size=10240' } }),
          cwd: REPO_ROOT,
          wait: true,
        });
      } catch (error) {
        didTypeCheckFail = true;
      }
    }

    // Remove stray .d.ts files that tsgo/tsc may emit alongside source files
    await cleanupStrayDeclarations(log);

    const hasLocalChanges = shouldUseArchive ? await detectLocalChanges() : false;

    if (shouldUseArchive) {
      if (hasLocalChanges) {
        const message = `uncommitted changes were detected after the TypeScript build. TypeScript cache artifacts must be generated from a clean working tree.`;

        if (isCiEnvironment()) {
          throw new Error(`Canceling TypeScript cache archive because ${message}`);
        }

        log.info(`Skipping TypeScript cache archive because ${message}`);
      } else {
        await archiveTSBuildArtifacts(log);
      }
    } else {
      log.verbose('Skipping TypeScript cache archive because --with-archive was not provided.');
    }

    // cleanup if requested
    if (flagsReader.boolean('cleanup')) {
      log.verbose('cleaning up');
      await cleanupRootRefsConfig();

      await asyncForEachWithLimit(created, 40, async (path) => {
        await Fsp.unlink(path);
      });
    }

    if (didTypeCheckFail) {
      throw createFailError('Unable to build TS project refs');
    }
  },
  {
    description: `
      Run the TypeScript compiler without emitting files so that it can check types during development.

      Examples:
        # check types in all projects
        node scripts/type_check

        # check types in a single project
        node scripts/type_check --project packages/kbn-pm/tsconfig.json
    `,
    flags: {
      string: ['project'],
      boolean: [
        'clean-cache',
        'cleanup',
        'extended-diagnostics',
        'with-archive',
        'tsgo',
        'show-progress',
      ],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
        --help                  Show this message
        --clean-cache           Delete any existing TypeScript caches before running type check
        --cleanup               Pass to avoid leaving temporary tsconfig files on disk. Leaving these
                                  files in place makes subsequent executions faster because ts can
                                  identify that none of the imports have changed (it uses creation/update
                                  times) but cleaning them prevents leaving garbage around the repo.
        --extended-diagnostics  Turn on extended diagnostics in the TypeScript compiler
        --with-archive          Restore cached artifacts before running and archive results afterwards
        --tsgo                  Use tsgo (TypeScript 7 native compiler) instead of tsc
        --show-progress         Show a live progress bar with project count, elapsed time, and current project
      `,
    },
  }
);
