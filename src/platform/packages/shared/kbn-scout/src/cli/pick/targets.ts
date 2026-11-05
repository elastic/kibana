/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { testTargets } from '@kbn/scout-info';
import { testConfig } from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import { getChangedSince, getSpecs } from './configs';
import type { PinnedConfig } from './pins';

const CACHE_DIR = Path.resolve(REPO_ROOT, '.scout/cache/pick_targets');
const LIST_TIMEOUT_MS = 120_000;

const LOCAL_TAGS = new Set(testTargets.local.map(({ tag }) => tag));

/** Manifests record `@local-…`, the Playwright JSON report records `local-…` */
const toLocalTags = (tags: string[]): string[] =>
  tags
    .map((tag) => (tag.startsWith('@') ? tag.slice(1) : tag))
    .filter((tag) => LOCAL_TAGS.has(tag));

/** Local target tags each spec declares, by repo-relative spec path */
type SpecTags = Map<string, string[]>;

/** A spec with no local tag still gets an entry, so it isn't mistaken for an unlisted one */
const addTags = (specTags: SpecTags, file: string, tags: string[]) => {
  specTags.set(file, [...new Set([...(specTags.get(file) ?? []), ...toLocalTags(tags)])]);
};

const mtimeMs = (file: string): number => {
  try {
    return Fs.statSync(Path.resolve(REPO_ROOT, file)).mtimeMs;
  } catch {
    return 0;
  }
};

/**
 * Tags from the committed manifest, which a scheduled job keeps up to date. It can't know about a
 * spec added or edited since it last ran, so those fall through to Playwright.
 */
const fromManifest = async (configPath: string, specs: string[]): Promise<SpecTags | undefined> => {
  const { manifest } = testConfig.fromPath(configPath);
  if (!manifest.exists) {
    return undefined;
  }
  const specTags: SpecTags = new Map();
  for (const { location, tags } of manifest.tests) {
    addTags(specTags, location.file, tags);
  }
  if (specs.some((spec) => !specTags.has(spec))) {
    return undefined;
  }
  // Deliberately per spec, not per config: the manifest is regenerated on a schedule, so any
  // unrelated commit in the directory would otherwise discard tags that are still correct.
  const edited = await getChangedSince(specs);
  return edited.length ? undefined : specTags;
};

interface PlaywrightSpec {
  file: string;
  tags?: string[];
}

interface PlaywrightSuite {
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

/** Spec paths in the report are relative to the config's `rootDir` */
const collectSpecs = (suites: PlaywrightSuite[], rootDir: string, specTags: SpecTags) => {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      addTags(
        specTags,
        Path.relative(REPO_ROOT, Path.resolve(rootDir, spec.file)),
        spec.tags ?? []
      );
    }
    collectSpecs(suite.suites ?? [], rootDir, specTags);
  }
};

/** Asks Playwright what it would run: the only source that sees uncommitted tag changes */
const fromPlaywright = async (
  log: ToolingLog,
  configPath: string
): Promise<SpecTags | undefined> => {
  const { exitCode, stdout } = await execa(
    'node',
    [
      'scripts/playwright',
      'test',
      `--config=${configPath}`,
      '--project=local',
      '--list',
      '--reporter=json',
      '--pass-with-no-tests',
    ],
    { cwd: REPO_ROOT, reject: false, timeout: LIST_TIMEOUT_MS }
  );

  try {
    if (exitCode !== 0) {
      throw new Error(`playwright --list exited with ${exitCode}`);
    }
    const { config, suites } = JSON.parse(stdout);
    const specTags: SpecTags = new Map();
    collectSpecs(suites ?? [], config?.rootDir ?? REPO_ROOT, specTags);
    return specTags;
  } catch (error) {
    log.warning(`Could not list the tests of ${configPath}: ${error.message}`);
    return undefined;
  }
};

interface CacheEntry {
  key: string;
  specTags: Record<string, string[]>;
}

const cacheFile = (configPath: string) =>
  Path.join(CACHE_DIR, `${configPath.replace(/[^\w]+/g, '_')}.json`);

/** Editing a spec or the config changes what Playwright lists, so their mtimes key the cache */
const cacheKey = (configPath: string, configSpecs: string[]) =>
  [configPath, ...configSpecs].map((file) => `${file}:${mtimeMs(file)}`).join('|');

const readCache = (file: string, key: string): SpecTags | undefined => {
  try {
    const entry: CacheEntry = JSON.parse(Fs.readFileSync(file, 'utf8'));
    return entry.key === key ? new Map(Object.entries(entry.specTags)) : undefined;
  } catch {
    return undefined;
  }
};

const writeCache = (file: string, key: string, specTags: SpecTags) => {
  try {
    Fs.mkdirSync(Path.dirname(file), { recursive: true });
    Fs.writeFileSync(file, JSON.stringify({ key, specTags: Object.fromEntries(specTags) }));
  } catch {
    // only costs a slower answer next time
  }
};

/** Playwright's answer for this config, listed once and kept until a spec or the config changes */
const fromCache = async (
  log: ToolingLog,
  configPath: string,
  configSpecs: string[]
): Promise<SpecTags | undefined> => {
  const file = cacheFile(configPath);
  const key = cacheKey(configPath, configSpecs);
  const cached = readCache(file, key);
  if (cached) {
    return cached;
  }
  log.write(chalk.dim('Checking which targets these tests run on…'));
  const specTags = await fromPlaywright(log, configPath);
  if (specTags) {
    writeCache(file, key, specTags);
  }
  return specTags;
};

export interface TargetCoverage {
  /** Local target tags at least one of the specs runs on, the ones covering most specs first */
  tags: string[];
  /** How many of the specs run on each tag */
  counts: Map<string, number>;
  /** How many specs those counts are out of */
  total: number;
  /** False when no source could resolve the tags and the config's own targets are offered */
  known: boolean;
}

/**
 * The targets the specs about to run actually declare. A config's own targets are the union over
 * all of its tests, so offering those would let you pick one that runs none of the picked specs.
 */
export const getTargetCoverage = async (
  log: ToolingLog,
  config: PinnedConfig,
  picked: string[]
): Promise<TargetCoverage> => {
  const configSpecs = getSpecs(config.path);
  const specs = picked.length ? picked : configSpecs;
  const total = specs.length;
  const fallback: TargetCoverage = { tags: config.targets, counts: new Map(), total, known: false };

  const specTags =
    (await fromManifest(config.path, specs)) ?? (await fromCache(log, config.path, configSpecs));
  if (!specTags) {
    return fallback;
  }

  const counts = new Map<string, number>();
  for (const spec of specs) {
    for (const tag of specTags.get(spec) ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const countOf = (tag: string) => counts.get(tag) ?? 0;
  const tags = [...counts.keys()].sort((a, b) => countOf(b) - countOf(a) || a.localeCompare(b));
  // every offered target runs at least one spec, so the run can't come back with no tests
  return tags.length ? { tags, counts, total, known: true } : fallback;
};
