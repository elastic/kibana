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

export interface RenderOptions {
  readonly files: readonly string[];
  readonly outputDir: string;
  readonly outputInPlace: boolean;
  readonly width: number;
  readonly height: number;
  readonly transparent: boolean;
  /** Dagre rank direction: `'TB'` (vertical, default) or `'LR'` (horizontal). */
  readonly direction: 'TB' | 'LR';
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
 * Full pipeline: build bundle → start server → drive Playwright → write PNGs.
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
    direction,
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
  const server = await startDevServer(
    entries,
    bundleDir,
    { transparent, direction },
    width,
    height
  );
  const base = `http://127.0.0.1:${server.port}`;
  log.info(`Dev server listening at ${base}/`);

  let captureError: unknown;
  try {
    // ── 3. Launch Playwright ────────────────────────────────────────────────
    let playwright: typeof import('playwright');
    try {
      playwright = await import('playwright');
    } catch {
      throw new Error(
        "Unable to import 'playwright'. Make sure dependencies are bootstrapped (`yarn kbn bootstrap`)."
      );
    }

    // With no --chrome-executable override, Playwright launches the managed
    // Chromium build it downloads during `yarn kbn bootstrap` (no system Chrome
    // detection needed). If that download is missing, Playwright's own launch
    // error already explains how to fetch it (`npx playwright install chromium`).
    log.debug(
      chromeExecutable
        ? `Using Chrome at: ${chromeExecutable}`
        : "Using Playwright's managed Chromium."
    );

    const browser = await playwright.chromium.launch({
      headless,
      executablePath: chromeExecutable,
    });

    const results: ManifestEntry[] = new Array(files.length);

    // Precomputed once, up-front, so filenames are deterministic regardless of
    // the order in which the concurrent workers below process the queue.
    const screenshotDirs = files.map((file) => (outputInPlace ? path.dirname(file) : outputDir));
    const screenshotFilenames = computeScreenshotFilenames(entries, screenshotDirs);

    try {
      // Open concurrency-many pages upfront; each worker drains a shared queue.
      const pages = await Promise.all(
        Array.from({ length: Math.min(concurrency, files.length) }, () =>
          browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
        )
      );

      const queue = files.map((_, i) => i);

      await Promise.all(
        pages.map(async (page) => {
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
                undefined,
                { timeout: 30_000 }
              );

              // Extra settle for EUI icon lazy-loading — see README for details
              if (settleMs > 0) {
                await new Promise((r) => setTimeout(r, settleMs));
              }

              // The YAML can be syntactically valid yet not resemble a workflow at all
              // (e.g. missing/misnamed `steps`/`triggers`) — parsing succeeds but the
              // graph has no nodes, so the screenshot below would be a blank canvas.
              // See README Caveats for details.
              const nodeCount = await page.evaluate(
                () => (window as unknown as Record<string, unknown>).__GRAPH_NODE_COUNT__ as number
              );
              if (nodeCount === 0) {
                log.warning(
                  `[${idx + 1}/${
                    files.length
                  }] ${name}: YAML parsed but produced an empty graph (0 nodes) — check for missing or misnamed "steps"/"triggers". The screenshot will be blank.`
                );
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
  } catch (err: unknown) {
    captureError = err;
  }

  // The dev server serves files from the bundle directory (and injects raw YAML
  // into HTML) on 127.0.0.1 — it must never outlive an unsuccessful run. Only
  // keep it open when --serve was requested AND capture completed cleanly;
  // any failure always tears it down, regardless of --serve, instead of relying
  // on the CLI runner's outer process.exit() to reclaim the port for us.
  if (captureError || !serve) {
    await server.close();
  }

  if (captureError) {
    throw captureError;
  }

  if (serve) {
    log.info(`--serve: keeping server alive at ${base}/. Press Ctrl+C to stop.`);
    await new Promise(() => {}); // wait forever
  }
};
