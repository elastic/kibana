/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildBrowserBundle } from './build_browser_bundle';
import { startDevServer } from './dev_server';

// Common system Chrome/Chromium paths, checked in order when puppeteer's
// bundled Chrome isn't installed.
const SYSTEM_CHROME_PATHS: readonly string[] = [
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  // Linux
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

export interface RenderOptions {
  readonly files: readonly string[];
  readonly outputDir: string;
  readonly outputInPlace: boolean;
  readonly width: number;
  readonly height: number;
  readonly transparent: boolean;
  readonly settleMs: number;
  readonly concurrency: number;
  readonly serve: boolean;
  readonly headless: boolean;
  readonly chromeExecutable?: string;
  readonly log: ToolingLog;
}

export interface ManifestEntry {
  readonly name: string;
  readonly yamlPath: string;
  readonly screenshotPath: string;
  readonly status: 'ok' | 'error';
  readonly error?: string;
}

export interface Manifest {
  readonly generatedAt: string;
  readonly entries: readonly ManifestEntry[];
}

export const slugify = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/, '')
    .slice(0, 120) || 'workflow';

/**
 * Computes the PNG filename for each entry, disambiguating workflows that would
 * otherwise collide because they land in the same directory with the same
 * slugified name (e.g. two files titled "My Workflow" in different source
 * folders, both writing to a shared --output-dir). Disambiguation folds the
 * source file's parent directory into the name; a numeric suffix is added as a
 * last resort if that still collides. Computed once up-front (rather than
 * during the concurrent screenshot loop) so the result is deterministic
 * regardless of processing order.
 */
export const computeScreenshotFilenames = (
  entries: readonly { readonly name: string; readonly yamlPath: string }[],
  screenshotDirs: readonly string[]
): string[] => {
  const baseNames = entries.map((e) => slugify(e.name));

  const groups = new Map<string, number[]>();
  entries.forEach((_, i) => {
    const key = `${screenshotDirs[i]}::${baseNames[i]}`;
    const group = groups.get(key) ?? [];
    group.push(i);
    groups.set(key, group);
  });

  const filenames = new Array<string>(entries.length);
  for (const indices of groups.values()) {
    if (indices.length === 1) {
      filenames[indices[0]] = `${baseNames[indices[0]]}.png`;
      continue;
    }

    const seen = new Map<string, number>();
    for (const i of indices) {
      const dirSlug = slugify(path.basename(path.dirname(entries[i].yamlPath)));
      const candidateBase = `${baseNames[i]}__${dirSlug}`;
      const count = seen.get(candidateBase) ?? 0;
      seen.set(candidateBase, count + 1);
      filenames[i] = count === 0 ? `${candidateBase}.png` : `${candidateBase}_${count + 1}.png`;
    }
  }

  return filenames;
};

/**
 * Full pipeline: build bundle → start server → drive puppeteer → write PNGs.
 * Each YAML file gets its own page and PNG; pages are processed concurrently up
 * to `options.concurrency` at a time via a simple worker-pool pattern.
 */
export const renderWorkflows = async (options: RenderOptions): Promise<void> => {
  const {
    files,
    outputDir,
    outputInPlace,
    width,
    height,
    transparent,
    settleMs,
    concurrency,
    serve,
    headless,
    chromeExecutable,
    log,
  } = options;

  // In in-place mode the per-file dirs already exist; we still need outputDir for manifest.json.
  await fs.mkdir(outputDir, { recursive: true });

  // ── 1. Build browser bundle ────────────────────────────────────────────────
  log.info('Building browser bundle (webpack)…');
  const bundlePath = await buildBrowserBundle();
  const bundleDir = path.dirname(bundlePath);
  log.success(`Bundle written to ${bundlePath}`);

  // ── 2. Start local dev server ──────────────────────────────────────────────
  const entries = files.map((f) => ({ name: path.basename(f, path.extname(f)), yamlPath: f }));
  const server = await startDevServer(entries, bundleDir, { transparent }, width, height);
  const base = `http://127.0.0.1:${server.port}`;
  log.info(`Dev server listening at ${base}/`);

  try {
    if (serve && files.length === 0) {
      log.info('--serve mode: no input files, keeping server alive. Press Ctrl+C to stop.');
      await new Promise(() => {}); // wait forever
      return;
    }

    // ── 3. Launch puppeteer ─────────────────────────────────────────────────
    let puppeteer: typeof import('puppeteer');
    try {
      puppeteer = await import('puppeteer');
    } catch {
      throw new Error(
        "Unable to import 'puppeteer'. Make sure dependencies are bootstrapped (`yarn kbn bootstrap`)."
      );
    }

    // Redirect HOME so Chromium can always write its crash/profile dirs
    const chromeHome = path.join(outputDir, '.chrome_home');
    await fs.mkdir(chromeHome, { recursive: true });

    // Resolve which Chrome executable to use:
    //   1. --chrome-executable flag (explicit override)
    //   2. puppeteer's bundled Chrome (if installed)
    //   3. system Chrome / Chromium (common locations)
    let resolvedExecutable: string | undefined = chromeExecutable;
    if (!resolvedExecutable) {
      const puppeteerPath = await puppeteer.executablePath().catch(() => undefined);
      if (puppeteerPath) {
        // executablePath() resolves even if the binary isn't installed; verify it exists.
        const exists = await fs
          .access(puppeteerPath)
          .then(() => true)
          .catch(() => false);
        if (exists) {
          resolvedExecutable = puppeteerPath;
        }
      }
    }
    if (!resolvedExecutable) {
      for (const candidate of SYSTEM_CHROME_PATHS) {
        const exists = await fs
          .access(candidate)
          .then(() => true)
          .catch(() => false);
        if (exists) {
          resolvedExecutable = candidate;
          break;
        }
      }
    }
    if (!resolvedExecutable) {
      throw new Error(
        'No Chrome/Chromium executable found.\n\n' +
          'Options:\n' +
          '  1. Install puppeteer Chrome: npx puppeteer browsers install chrome\n' +
          '  2. Pass the path explicitly: --chrome-executable "/path/to/chrome"\n'
      );
    }
    log.debug(`Using Chrome at: ${resolvedExecutable}`);

    const browser = await puppeteer.launch({
      headless,
      executablePath: resolvedExecutable,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-crashpad',
        '--disable-crash-reporter',
        '--no-crash-upload',
      ],
      env: {
        ...process.env,
        HOME: chromeHome,
        XDG_CACHE_HOME: path.join(chromeHome, '.cache'),
      },
    });

    const results: ManifestEntry[] = new Array(files.length);

    // Precomputed once, up-front, so filenames are deterministic regardless of
    // the order in which the concurrent workers below process the queue.
    const screenshotDirs = files.map((file) => (outputInPlace ? path.dirname(file) : outputDir));
    const screenshotFilenames = computeScreenshotFilenames(entries, screenshotDirs);

    try {
      // Open concurrency-many pages upfront; each worker drains a shared queue.
      const pages = await Promise.all(
        Array.from({ length: Math.min(concurrency, files.length) }, () => browser.newPage())
      );

      const queue = files.map((_, i) => i);

      await Promise.all(
        pages.map(async (page) => {
          await page.setViewport({ width, height, deviceScaleFactor: 1 });

          while (queue.length > 0) {
            const idx = queue.shift();
            if (idx === undefined) break;

            const file = files[idx];
            const name = entries[idx].name;
            const url = `${base}/w/${idx}`;

            try {
              await page.goto(url, { waitUntil: 'load', timeout: 30_000 });

              // Wait for React Flow to initialise and the onReady callback to fire
              await page.waitForFunction(
                () => (window as unknown as Record<string, unknown>).__GRAPH_READY__ === true,
                {
                  timeout: 30_000,
                }
              );

              // Extra settle for EUI icon lazy-loading — see README for details
              if (settleMs > 0) {
                await new Promise((r) => setTimeout(r, settleMs));
              }

              const screenshotDir = screenshotDirs[idx];
              const screenshotPath = path.join(screenshotDir, screenshotFilenames[idx]);
              await page.screenshot({ type: 'png', path: screenshotPath });

              log.success(`[${idx + 1}/${files.length}] ${name} → ${screenshotPath}`);
              results[idx] = {
                name,
                yamlPath: file,
                screenshotPath: outputInPlace
                  ? screenshotPath
                  : path.relative(outputDir, screenshotPath),
                status: 'ok',
              };
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              log.error(`[${idx + 1}/${files.length}] ${name} FAILED: ${msg}`);
              results[idx] = {
                name,
                yamlPath: file,
                screenshotPath: '',
                status: 'error',
                error: msg,
              };
            }
          }
        })
      );
    } finally {
      await browser.close();
    }

    // ── 4. Write manifest ────────────────────────────────────────────────────
    const manifest: Manifest = {
      generatedAt: new Date().toISOString(),
      entries: results,
    };
    const manifestPath = path.join(outputDir, 'manifest.json');
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const ok = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'error').length;
    log.info(
      `Done. ${ok} PNG(s) written ${
        outputInPlace ? 'alongside their YAML files' : `to ${outputDir}`
      }${failed > 0 ? `, ${failed} error(s) — check manifest.json` : ''}`
    );

    if (serve) {
      log.info(`--serve: keeping server alive at ${base}/. Press Ctrl+C to stop.`);
      await new Promise(() => {}); // wait forever
    }
  } finally {
    if (!serve) {
      await server.close();
    }
  }
};
