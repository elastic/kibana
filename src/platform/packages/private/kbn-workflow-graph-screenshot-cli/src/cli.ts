/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { renderWorkflows } from './render_workflows';

/**
 * Resolves one or more file/directory/glob inputs to an ordered, deduplicated
 * list of absolute YAML file paths.
 *
 * Exported so it can be unit-tested without starting a browser or server.
 */
export const resolveYamlInputs = async (inputs: readonly string[]): Promise<string[]> => {
  const resolved: string[] = [];

  for (const input of inputs) {
    const absInput = path.resolve(input);

    // First try the input as a glob pattern
    const globMatches = (
      await fg(input, {
        absolute: true,
        onlyFiles: true,
      })
    ).filter(isYaml);

    if (globMatches.length > 0) {
      resolved.push(...globMatches);
    } else {
      // No glob matches — check if it is a plain directory or file
      let stat: Awaited<ReturnType<typeof fs.stat>> | null = null;
      try {
        stat = await fs.stat(absInput);
      } catch {
        // Neither a glob match nor an existing path; silently skip
      }

      if (stat?.isDirectory()) {
        const dirMatches = await fg(`${absInput}/**/*.{yaml,yml}`, {
          absolute: true,
          onlyFiles: true,
        });
        resolved.push(...dirMatches);
      } else if (stat?.isFile() && isYaml(absInput)) {
        resolved.push(absInput);
      }
      // Non-matching globs/paths are skipped; the caller validates
      // that the final list is non-empty.
    }
  }

  // Deduplicate while preserving order
  return [...new Set(resolved)];
};

const isYaml = (p: string): boolean => /\.ya?ml$/i.test(p);

/** Entry point called by scripts/workflow_graph_screenshot.js */
export const runCli = (): void => {
  run(
    async ({ log, flags }) => {
      const inputRaw = flags.input as string | string[] | undefined;
      if (!inputRaw) {
        throw createFlagError('--input is required. Pass a file, directory, or glob pattern.');
      }
      const inputs = Array.isArray(inputRaw) ? inputRaw : [inputRaw];
      const files = await resolveYamlInputs(inputs);

      if (files.length === 0) {
        throw createFlagError(
          `--input matched no YAML files.\n  Input(s): ${inputs.join(
            ', '
          )}\n  Make sure the paths exist and have .yaml or .yml extensions.`
        );
      }

      log.info(`Found ${files.length} YAML file(s)`);

      const themeFlag = (flags.theme as string | undefined) ?? 'light';
      if (themeFlag !== 'light') {
        throw createFlagError(
          `--theme "${themeFlag}" is not supported yet. Only "light" is available.`
        );
      }

      const layoutFlag = (flags.layout as string | undefined) ?? 'vertical';
      if (layoutFlag !== 'vertical' && layoutFlag !== 'horizontal') {
        throw createFlagError(
          `--layout "${layoutFlag}" is invalid. Use "vertical" or "horizontal".`
        );
      }
      const direction = layoutFlag === 'horizontal' ? 'LR' : 'TB';

      const outputDirFlag = flags['output-dir'] as string | undefined;
      const outputInPlace = Boolean(flags['output-in-place']);

      if (outputInPlace && outputDirFlag !== undefined) {
        throw createFlagError(
          '--output-in-place and --output-dir are mutually exclusive. ' +
            'Use one or the other, not both.'
        );
      }

      // In in-place mode outputDir is only used for manifest.json (cwd-relative).
      const outputDir = path.resolve(outputDirFlag ?? './workflow-graph-screenshots');
      const width = Number((flags.width as string | undefined) ?? 1600);
      const height = Number((flags.height as string | undefined) ?? 1000);
      const transparent = Boolean(flags.transparent);
      const settleMs = Number((flags['settle-ms'] as string | undefined) ?? 500);
      const concurrency = Math.max(1, Number((flags.concurrency as string | undefined) ?? 4));
      const serve = Boolean(flags.serve);
      const headless = ((flags.headless as string | undefined) ?? 'true') !== 'false';
      const chromeExecutable = (flags['chrome-executable'] as string | undefined) || undefined;

      if (!Number.isFinite(width) || width < 100) {
        throw createFlagError(`--width must be a number >= 100 (got "${flags.width}")`);
      }
      if (!Number.isFinite(height) || height < 100) {
        throw createFlagError(`--height must be a number >= 100 (got "${flags.height}")`);
      }
      if (!Number.isFinite(settleMs) || settleMs < 0) {
        throw createFlagError(`--settle-ms must be a number >= 0 (got "${flags['settle-ms']}")`);
      }
      if (!Number.isFinite(concurrency)) {
        throw createFlagError(`--concurrency must be a number (got "${flags.concurrency}")`);
      }

      await renderWorkflows({
        files,
        outputDir,
        outputInPlace,
        width,
        height,
        transparent,
        direction,
        settleMs,
        concurrency,
        serve,
        headless,
        chromeExecutable,
        log,
      });
    },
    {
      description:
        'Render workflow YAML files to PNG screenshots without requiring a running Kibana server.',
      usage: 'node scripts/workflow_graph_screenshot.js --input <path> [options]',
      flags: {
        string: [
          'input',
          'output-dir',
          'width',
          'height',
          'theme',
          'layout',
          'settle-ms',
          'concurrency',
          'headless',
          'chrome-executable',
        ],
        boolean: ['transparent', 'serve', 'output-in-place'],
        default: {
          width: '1600',
          height: '1000',
          theme: 'light',
          layout: 'vertical',
          'settle-ms': '500',
          concurrency: '4',
          headless: 'true',
          transparent: false,
          serve: false,
        },
        help: `
  --input <path>          File, directory, or glob of YAML files to render.
                          Pass multiple times to include several sources.
  --output-dir <dir>      Directory for output PNGs and manifest.json.
                          (default: ./workflow-graph-screenshots)
  --output-in-place       Write each PNG alongside its source YAML file.
                          Incompatible with --output-dir.
  --width <px>            Browser viewport width in pixels. (default: 1600)
  --height <px>           Browser viewport height in pixels. (default: 1000)
  --theme <name>          Colour theme to render. Only "light" is supported. (default: light)
  --layout <name>         Graph layout direction: "vertical" or "horizontal". (default: vertical)
  --transparent           Render with a transparent background (no dot-grid pattern).
  --settle-ms <ms>        Extra wait after the graph is ready, for icon paint.
                          (default: 500)
  --concurrency <n>       Parallel browser pages. (default: 4)
  --headless <bool>       Run Chromium headless. Pass false to watch the browser. (default: true)
  --serve                 Keep the local server running after capture for manual browsing.
  --chrome-executable <path>  Path to a Chrome/Chromium executable. Defaults to Playwright's
                          managed Chromium (installed via \`yarn kbn bootstrap\`).
        `,
      },
    }
  );
};
