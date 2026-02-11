/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import crypto from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import type { FtrProviderContext } from './ftr_provider_context';
import type { Protocol } from 'devtools-protocol';
import { SourceMapConsumer, type RawSourceMap } from 'source-map';

const BROWSER_COVERAGE_ENV_VAR = 'TEST_BROWSER_COVERAGE';
const OUTPUT_DIR = 'target/kibana-coverage/browser';

type CoverageMode = 'auto' | 'manual';

/**
 * Generate a deterministic hash for coverage output filename.
 * @internal exported for testing
 */
export function generateCoverageHash(testFile: string, testTitle: string, label?: string): string {
  const input = label ? `${testFile}::${testTitle}::${label}` : `${testFile}::${testTitle}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * Generate a deterministic hash for a test file.
 * Intended for stable per-test-file output filenames.
 * @internal exported for testing
 */
export function generateTestFileCoverageHash(testFile: string): string {
  return crypto.createHash('sha256').update(testFile).digest('hex').substring(0, 16);
}

interface SourceFileCoverage {
  path: string;
  functions: Array<{
    name: string;
    line: number;
    column: number;
    count: number;
  }>;
}

type FunctionCoverage = { name: string; line: number; column: number; count: number };
type DedupedSourceFilesMap = Map<string, Map<string, FunctionCoverage>>;

/**
 * Determines if a script URL should be included in coverage.
 * Excludes npm bundles, empty URLs, and non-Kibana sources.
 * @internal exported for testing
 */
export function shouldIncludeScript(url: string): boolean {
  if (!url) return false;

  // Exclude npm shared deps (node_modules)
  if (url.includes('kbn-ui-shared-deps-npm')) return false;

  // Exclude inline scripts and data URLs
  if (url.startsWith('data:')) return false;

  // Only include Kibana bundle URLs
  if (!url.includes('/bundles/')) return false;

  return true;
}

/**
 * Extracts the bundle path from a full URL.
 * e.g., "http://localhost:5620/XXXX/bundles/plugin/foo/foo.plugin.js"
 *       -> "bundles/plugin/foo/foo.plugin.js"
 * @internal exported for testing
 */
export function getBundlePath(url: string): string {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/bundles\/(.+)$/);
    return match ? `bundles/${match[1]}` : parsed.pathname;
  } catch {
    return url;
  }
}

/**
 * Extract source map URL from script source.
 * @internal exported for testing
 */
export function extractSourceMapUrl(source: string, scriptUrl: string): string | null {
  const match = source.match(/\/\/[#@]\s*sourceMappingURL=(.+?)(\s|$)/);
  if (!match) return null;

  const sourceMapRef = match[1];

  // Handle absolute URLs
  if (sourceMapRef.startsWith('http')) {
    return sourceMapRef;
  }

  // Resolve relative URLs against script URL
  try {
    const scriptUrlObj = new URL(scriptUrl);
    return new URL(sourceMapRef, scriptUrlObj).toString();
  } catch {
    return sourceMapRef;
  }
}

/**
 * Determines if a source path is Kibana-owned code (not node_modules, not external).
 */
function isKibanaSourcePath(sourcePath: string): boolean {
  if (!sourcePath) return false;

  // Exclude node_modules
  if (sourcePath.includes('node_modules')) return false;

  // Exclude webpack internal paths
  if (sourcePath.startsWith('webpack/')) return false;

  // Must be a relative path within the repo or start with known prefixes
  if (
    sourcePath.startsWith('src/') ||
    sourcePath.startsWith('x-pack/') ||
    sourcePath.startsWith('packages/') ||
    sourcePath.includes('/src/') ||
    sourcePath.includes('/x-pack/') ||
    sourcePath.includes('/packages/')
  ) {
    return true;
  }

  return false;
}

/**
 * Normalize source path to be relative to repo root.
 */
function normalizeSourcePath(sourcePath: string): string {
  // Remove webpack:// prefix if present
  let normalized = sourcePath.replace(/^webpack:\/\/[^/]*\//, '');

  // Remove leading ./ or ../
  normalized = normalized.replace(/^(\.\.?\/)+/, '');

  // Extract path starting from src/, x-pack/, or packages/
  const match = normalized.match(/((?:src|x-pack|packages)\/.*)/);
  if (match) {
    return match[1];
  }

  return normalized;
}

/**
 * Thin service that automatically captures browser coverage per test
 * when enabled via `--browser-coverage` CLI flag.
 *
 * Coverage is resolved through source maps to original TypeScript/JavaScript
 * source files, filtering out node_modules and external dependencies.
 *
 * Modes:
 * - `auto` (default): Automatically captures coverage per test via lifecycle hooks
 * - `manual`: Only captures coverage when `capture()` is explicitly called
 */
export async function BrowserCoverageCollectorProvider(ctx: FtrProviderContext) {
  const envValue = process.env[BROWSER_COVERAGE_ENV_VAR];

  // Parse mode: '1' or 'auto' = auto mode, 'manual' = manual mode, anything else = disabled
  let mode: CoverageMode | null = null;
  if (envValue === '1' || envValue === 'auto') {
    mode = 'auto';
  } else if (envValue === 'manual') {
    mode = 'manual';
  }

  if (!mode) {
    return {
      enabled: false as const,
      mode: null,
      capture: async () => {
        throw new Error(
          'Browser coverage is not enabled. Use --browser-coverage or --browser-coverage=manual'
        );
      },
    };
  }

  const log = ctx.getService('log');
  const lifecycle = ctx.getService('lifecycle');
  const browser = ctx.getService('browser');

  const outputRoot = Path.resolve(REPO_ROOT, OUTPUT_DIR);

  log.info(`Browser coverage collector enabled (mode: ${mode}). Output: ${outputRoot}`);
  await mkdir(outputRoot, { recursive: true });

  let coverageActive = false;
  let warnedNonChromium = false;
  let currentTestFile: string | null = null;

  // Cache for script sources and source maps
  const scriptSourceCache = new Map<string, string>();
  const sourceMapCache = new Map<string, SourceMapConsumer | null>();

  function getOutputPathForTestFile(relTestFile: string) {
    const safeBase = Path.basename(relTestFile).replace(/[^a-zA-Z0-9._-]/g, '_');
    const hash = generateTestFileCoverageHash(relTestFile);
    return Path.join(outputRoot, `${safeBase}.${hash}.json`);
  }

  function mergeSourceFileCoverageIntoDedupedMap(
    target: DedupedSourceFilesMap,
    source: Map<string, SourceFileCoverage>
  ) {
    for (const [path, fileCoverage] of source) {
      if (!target.has(path)) {
        target.set(path, new Map());
      }
      const funcs = target.get(path)!;
      for (const fn of fileCoverage.functions) {
        const key = `${fn.name}:${fn.line}:${fn.column}`;
        if (funcs.has(key)) {
          funcs.get(key)!.count += fn.count;
        } else {
          funcs.set(key, { name: fn.name, line: fn.line, column: fn.column, count: fn.count });
        }
      }
    }
  }

  /**
   * Clear caches and destroy SourceMapConsumer instances to free WASM memory.
   */
  function clearCaches() {
    // Destroy all SourceMapConsumer instances to free WASM memory
    for (const consumer of sourceMapCache.values()) {
      if (consumer) {
        consumer.destroy();
      }
    }
    sourceMapCache.clear();
    scriptSourceCache.clear();
    log.debug('Cleared browser coverage caches');
  }

  /**
   * Fetch script source content from the browser via CDP.
   */
  async function fetchScriptSource(scriptId: string): Promise<string | null> {
    try {
      const result = await browser.sendCdpCommandAndGetResult<{ scriptSource: string }>(
        'Debugger.getScriptSource',
        { scriptId }
      );
      return result?.scriptSource ?? null;
    } catch (err) {
      log.debug(`Failed to fetch script source for ${scriptId}: ${err}`);
      return null;
    }
  }

  /**
   * Fetch and parse a source map.
   */
  async function fetchSourceMap(sourceMapUrl: string): Promise<SourceMapConsumer | null> {
    if (sourceMapCache.has(sourceMapUrl)) {
      return sourceMapCache.get(sourceMapUrl) ?? null;
    }

    try {
      const response = await fetch(sourceMapUrl);
      if (!response.ok) {
        log.debug(`Failed to fetch source map from ${sourceMapUrl}: ${response.status}`);
        sourceMapCache.set(sourceMapUrl, null);
        return null;
      }

      const rawSourceMap = (await response.json()) as RawSourceMap;
      const consumer = await new SourceMapConsumer(rawSourceMap);
      sourceMapCache.set(sourceMapUrl, consumer);
      return consumer;
    } catch (err) {
      log.debug(`Failed to parse source map from ${sourceMapUrl}: ${err}`);
      sourceMapCache.set(sourceMapUrl, null);
      return null;
    }
  }

  /**
   * Convert byte offset to line/column in source text.
   */
  function offsetToLineColumn(
    source: string,
    offset: number
  ): { line: number; column: number } | null {
    if (offset < 0 || offset > source.length) return null;

    let line = 1;
    let column = 0;
    for (let i = 0; i < offset && i < source.length; i++) {
      if (source[i] === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
    }
    return { line, column };
  }

  /**
   * Process coverage for a single script, resolving to original source files.
   * Deduplicates functions by name+line+column and aggregates counts.
   */
  async function processScriptCoverage(
    script: Protocol.Profiler.ScriptCoverage,
    bundleSource: string,
    sourceMapUrl: string | null
  ): Promise<Map<string, SourceFileCoverage>> {
    // Use nested maps for deduplication: path -> functionKey -> function data
    const sourceFilesMap = new Map<
      string,
      Map<string, { name: string; line: number; column: number; count: number }>
    >();

    if (!sourceMapUrl) {
      return convertToSourceFileCoverage(sourceFilesMap);
    }

    const consumer = await fetchSourceMap(sourceMapUrl);
    if (!consumer) {
      return convertToSourceFileCoverage(sourceFilesMap);
    }

    for (const func of script.functions) {
      for (const range of func.ranges) {
        if (range.count === 0) continue; // Skip uncovered ranges

        // Convert start offset to line/column
        const pos = offsetToLineColumn(bundleSource, range.startOffset);
        if (!pos) continue;

        // Map to original source
        const original = consumer.originalPositionFor({
          line: pos.line,
          column: pos.column,
        });

        if (!original.source) continue;

        const normalizedPath = normalizeSourcePath(original.source);

        // Filter to only Kibana-owned source files
        if (!isKibanaSourcePath(normalizedPath)) continue;

        const name = func.functionName || original.name || '(anonymous)';
        const line = original.line ?? 0;
        const column = original.column ?? 0;

        // Create unique key for deduplication
        const funcKey = `${name}:${line}:${column}`;

        // Initialize file map if needed
        if (!sourceFilesMap.has(normalizedPath)) {
          sourceFilesMap.set(normalizedPath, new Map());
        }

        const fileFuncs = sourceFilesMap.get(normalizedPath)!;

        // Aggregate counts for duplicate entries
        if (fileFuncs.has(funcKey)) {
          fileFuncs.get(funcKey)!.count += range.count;
        } else {
          fileFuncs.set(funcKey, { name, line, column, count: range.count });
        }
      }
    }

    return convertToSourceFileCoverage(sourceFilesMap);
  }

  /**
   * Convert the deduplicated map structure to SourceFileCoverage array format.
   */
  function convertToSourceFileCoverage(
    sourceFilesMap: DedupedSourceFilesMap
  ): Map<string, SourceFileCoverage> {
    const result = new Map<string, SourceFileCoverage>();

    for (const [path, funcsMap] of sourceFilesMap) {
      result.set(path, {
        path,
        functions: Array.from(funcsMap.values()).sort((a, b) => {
          // Sort by line, then column, then name
          if (a.line !== b.line) return a.line - b.line;
          if (a.column !== b.column) return a.column - b.column;
          return a.name.localeCompare(b.name);
        }),
      });
    }

    return result;
  }

  const aggregatesByTestFile = new Map<
    string,
    {
      auto: { tests: Set<string>; bundlesProcessed: number; sourceFiles: DedupedSourceFilesMap };
      manual: Map<
        string,
        { tests: Set<string>; bundlesProcessed: number; sourceFiles: DedupedSourceFilesMap }
      >;
    }
  >();
  const initializedTestFiles = new Set<string>();

  function getOrCreateAggregate(relTestFile: string) {
    if (!aggregatesByTestFile.has(relTestFile)) {
      aggregatesByTestFile.set(relTestFile, {
        auto: { tests: new Set(), bundlesProcessed: 0, sourceFiles: new Map() },
        manual: new Map(),
      });
    }
    return aggregatesByTestFile.get(relTestFile)!;
  }

  async function writeAggregatedCoverageForTestFile(relTestFile: string) {
    const agg = aggregatesByTestFile.get(relTestFile);
    if (!agg) return;

    const autoSourceFilesArray = Array.from(convertToSourceFileCoverage(agg.auto.sourceFiles).values())
      .sort((a, b) => a.path.localeCompare(b.path));

    const manualCaptures = Array.from(agg.manual.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, captureAgg]) => {
        const sourceFilesArray = Array.from(
          convertToSourceFileCoverage(captureAgg.sourceFiles).values()
        ).sort((a, b) => a.path.localeCompare(b.path));

        return {
          label,
          tests: Array.from(captureAgg.tests).sort(),
          bundlesProcessed: captureAgg.bundlesProcessed,
          sourceFilesCount: sourceFilesArray.length,
          sourceFiles: sourceFilesArray,
        };
      });

    const payload = {
      meta: {
        testFile: relTestFile,
        fileHash: generateTestFileCoverageHash(relTestFile),
        timestamp: new Date().toISOString(),
      },
      auto: {
        tests: Array.from(agg.auto.tests).sort(),
        bundlesProcessed: agg.auto.bundlesProcessed,
        sourceFilesCount: autoSourceFilesArray.length,
        sourceFiles: autoSourceFilesArray,
      },
      manual: {
        captures: manualCaptures,
      },
    };

    const outputPath = getOutputPathForTestFile(relTestFile);
    await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    log.info(
      `Browser coverage updated: ${outputPath} (auto source files: ${autoSourceFilesArray.length}, manual captures: ${manualCaptures.length})`
    );
  }

  // Track current test for manual capture context
  let currentTest: { file: string; title: string } | null = null;

  // Only register lifecycle hooks in auto mode
  if (mode === 'auto') {
    lifecycle.beforeEachTest.add(async (test) => {
      if (!browser.isChromium()) {
        if (!warnedNonChromium) {
          log.warning(
            'Browser coverage collection is only supported on Chromium browsers. Skipping.'
          );
          warnedNonChromium = true;
        }
        return;
      }

      // Clear caches when switching to a new test file to limit memory growth
      const testFile = test.file ?? test.parent?.file ?? null;
      if (testFile !== currentTestFile) {
        if (currentTestFile !== null) {
          clearCaches();
        }
        currentTestFile = testFile;
      }

      const relTestFile = testFile
        ? Path.isAbsolute(testFile)
          ? Path.relative(REPO_ROOT, testFile)
          : testFile
        : 'unknown_test_file';

      // Ensure a stable per-testFile artifact exists even if coverage ends up empty/skipped.
      if (!initializedTestFiles.has(relTestFile)) {
        initializedTestFiles.add(relTestFile);
        getOrCreateAggregate(relTestFile);
        await writeAggregatedCoverageForTestFile(relTestFile);
      }

      // Track current test for potential manual captures
      currentTest = {
        file: testFile ?? 'unknown_test_file',
        title: test.fullTitle(),
      };

      try {
        await browser.sendCdpCommand('Debugger.enable');
        await browser.startPreciseCoverage();
        coverageActive = true;
        log.debug(`Browser coverage started for: ${test.fullTitle()}`);
      } catch (err) {
        log.warning(`Failed to start browser coverage: ${err}`);
      }
    });
  }

  // In manual mode, still track current test via beforeEachTest but don't start coverage
  if (mode === 'manual') {
    lifecycle.beforeEachTest.add(async (test) => {
      const testFile = test.file ?? test.parent?.file ?? null;

      // Clear caches when switching to a new test file
      if (testFile !== currentTestFile) {
        if (currentTestFile !== null) {
          clearCaches();
        }
        currentTestFile = testFile;
      }

      const relTestFile = testFile
        ? Path.isAbsolute(testFile)
          ? Path.relative(REPO_ROOT, testFile)
          : testFile
        : 'unknown_test_file';

      // Ensure a stable per-testFile artifact exists even if only manual captures happen later.
      if (!initializedTestFiles.has(relTestFile)) {
        initializedTestFiles.add(relTestFile);
        getOrCreateAggregate(relTestFile);
        await writeAggregatedCoverageForTestFile(relTestFile);
      }

      currentTest = {
        file: testFile ?? 'unknown_test_file',
        title: test.fullTitle(),
      };
    });
  }

  // Only register afterEachTest in auto mode
  if (mode === 'auto') {
    lifecycle.afterEachTest.add(async (test) => {
      if (!coverageActive) {
        return;
      }
      coverageActive = false;

    try {
      const coverage = await browser.takePreciseCoverage();
      await browser.stopPreciseCoverage();

      if (!coverage?.result) {
        log.debug('No coverage data returned');
        await browser.sendCdpCommand('Debugger.disable');
        return;
      }

      // Filter to only Kibana source scripts
      const relevantScripts = coverage.result.filter((script) => shouldIncludeScript(script.url));

      if (relevantScripts.length === 0) {
        log.debug('No relevant scripts in coverage');
        await browser.sendCdpCommand('Debugger.disable');
        return;
      }

      log.debug(
        `Processing coverage for ${relevantScripts.length} scripts (filtered from ${coverage.result.length})`
      );

      // Fetch all script sources in parallel
      const scriptsNeedingSource = relevantScripts.filter(
        (script) => !scriptSourceCache.has(script.scriptId)
      );

      if (scriptsNeedingSource.length > 0) {
        log.debug(`Fetching sources for ${scriptsNeedingSource.length} scripts in parallel`);
        const sourceResults = await Promise.all(
          scriptsNeedingSource.map(async (script) => ({
            scriptId: script.scriptId,
            source: await fetchScriptSource(script.scriptId),
          }))
        );

        for (const { scriptId, source } of sourceResults) {
          if (source) {
            scriptSourceCache.set(scriptId, source);
          }
        }
      }

      await browser.sendCdpCommand('Debugger.disable');

      // Process each script and resolve to original source files
      const allSourceFiles = new Map<string, SourceFileCoverage>();

      for (const script of relevantScripts) {
        const bundleSource = scriptSourceCache.get(script.scriptId) ?? '';
        const sourceMapUrl = bundleSource ? extractSourceMapUrl(bundleSource, script.url) : null;

        const scriptSourceFiles = await processScriptCoverage(script, bundleSource, sourceMapUrl);

        // Merge while deduplicating across scripts
        for (const [path, fileCoverage] of scriptSourceFiles) {
          if (allSourceFiles.has(path)) {
            allSourceFiles.get(path)!.functions.push(...fileCoverage.functions);
          } else {
            allSourceFiles.set(path, fileCoverage);
          }
        }
      }

      const testFile = test.file ?? test.parent?.file ?? 'unknown_test_file';
      const relTestFile = Path.isAbsolute(testFile)
        ? Path.relative(REPO_ROOT, testFile)
        : testFile;

      const agg = getOrCreateAggregate(relTestFile);
      agg.auto.tests.add(test.fullTitle());
      agg.auto.bundlesProcessed += relevantScripts.length;
      mergeSourceFileCoverageIntoDedupedMap(agg.auto.sourceFiles, allSourceFiles);
      await writeAggregatedCoverageForTestFile(relTestFile);
    } catch (err) {
      log.warning(`Failed to capture browser coverage: ${err}`);
      try {
        await browser.sendCdpCommand('Debugger.disable');
      } catch {
        // Ignore cleanup errors
      }
    }
    });
  } // end if (mode === 'auto')

  lifecycle.cleanup.add(async () => {
    for (const relTestFile of aggregatesByTestFile.keys()) {
      await writeAggregatedCoverageForTestFile(relTestFile);
    }
  });

  /**
   * Manually capture coverage for a specific code block.
   * Works in both auto and manual modes.
   */
  async function capture<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; outputPath: string }> {
    if (!browser.isChromium()) {
      throw new Error('Browser coverage is only supported on Chromium browsers');
    }

    if (!currentTest) {
      throw new Error('capture() must be called within a test context');
    }

    const relTestFile = Path.isAbsolute(currentTest.file)
      ? Path.relative(REPO_ROOT, currentTest.file)
      : currentTest.file;

    log.debug(`Starting manual coverage capture: ${label}`);

    // Start coverage for this capture
    await browser.sendCdpCommand('Debugger.enable');
    await browser.startPreciseCoverage();

    let result!: T;
    let thrown: unknown;

    try {
      result = await fn();
    } catch (e) {
      thrown = e;
    }

    // Capture and process coverage
    const coverage = await browser.takePreciseCoverage();
    await browser.stopPreciseCoverage();

    if (!coverage?.result) {
      await browser.sendCdpCommand('Debugger.disable');
      if (thrown) throw thrown;
      throw new Error('No coverage data returned');
    }

    const relevantScripts = coverage.result.filter((script) => shouldIncludeScript(script.url));

    // Fetch script sources in parallel
    const scriptsNeedingSource = relevantScripts.filter(
      (script) => !scriptSourceCache.has(script.scriptId)
    );

    if (scriptsNeedingSource.length > 0) {
      const sourceResults = await Promise.all(
        scriptsNeedingSource.map(async (script) => ({
          scriptId: script.scriptId,
          source: await fetchScriptSource(script.scriptId),
        }))
      );

      for (const { scriptId, source } of sourceResults) {
        if (source) {
          scriptSourceCache.set(scriptId, source);
        }
      }
    }

    await browser.sendCdpCommand('Debugger.disable');

    // Process coverage
    const allSourceFiles = new Map<string, SourceFileCoverage>();

    for (const script of relevantScripts) {
      const bundleSource = scriptSourceCache.get(script.scriptId) ?? '';
      const sourceMapUrl = bundleSource ? extractSourceMapUrl(bundleSource, script.url) : null;

      const scriptSourceFiles = await processScriptCoverage(script, bundleSource, sourceMapUrl);

      for (const [path, fileCoverage] of scriptSourceFiles) {
        if (allSourceFiles.has(path)) {
          allSourceFiles.get(path)!.functions.push(...fileCoverage.functions);
        } else {
          allSourceFiles.set(path, fileCoverage);
        }
      }
    }

    const agg = getOrCreateAggregate(relTestFile);
    if (!agg.manual.has(label)) {
      agg.manual.set(label, { tests: new Set(), bundlesProcessed: 0, sourceFiles: new Map() });
    }

    const labelAgg = agg.manual.get(label)!;
    labelAgg.tests.add(currentTest.title);
    labelAgg.bundlesProcessed += relevantScripts.length;
    mergeSourceFileCoverageIntoDedupedMap(labelAgg.sourceFiles, allSourceFiles);

    await writeAggregatedCoverageForTestFile(relTestFile);
    const outputPath = getOutputPathForTestFile(relTestFile);
    log.info(`Manual coverage captured: ${label} -> ${outputPath}`);

    if (thrown) throw thrown;
    return { result, outputPath };
  }

  return {
    enabled: true as const,
    mode,
    outputRoot,
    capture,
  };
}
