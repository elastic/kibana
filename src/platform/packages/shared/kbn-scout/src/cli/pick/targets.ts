/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { testLimits, testTargets } from '@kbn/scout-info';
import { getGitSHA1ForPath, testConfig } from '@kbn/scout-reporting';
import { resolveTargetAttributes } from '../../tests_discovery/tag_utils';
import type { PinnedConfig } from './pins';

const LOCAL_TAGS = new Set(testTargets.local.map(({ tag }) => tag));

export const MANIFEST_UPDATE_CMD = 'node scripts/scout update-test-config-manifests';

/** Manifests record `@local-…`, the target tags they map to drop the `@` */
const toLocalTags = (tags: string[]): string[] =>
  tags
    .map((tag) => (tag.startsWith('@') ? tag.slice(1) : tag))
    .filter((tag) => LOCAL_TAGS.has(tag));

/** Local target tags each spec declares, by repo-relative spec path */
type SpecTags = Map<string, string[]>;

/** Tags of tests the run would grep out anyway, e.g. `@limit/only-fips` off a FIPS target */
const getUnsatisfiedLimitTags = () =>
  new Set(
    testLimits.unsatisfiedBy(resolveTargetAttributes(undefined)).map((limit) => limit.playwrightTag)
  );

/**
 * Tags recorded by the last manifest update, which runs on a schedule. Tags change far less
 * often than test bodies, so a spec the manifest lists is trusted even when you have edited it.
 * A spec it doesn't list at all, a new one for instance, leaves the manifest unable to answer.
 */
const fromManifest = (configPath: string, specs: string[]): SpecTags | undefined => {
  const { manifest } = testConfig.fromPath(configPath);
  if (!manifest.exists) {
    return undefined;
  }

  const unsatisfied = getUnsatisfiedLimitTags();
  const specTags: SpecTags = new Map();
  for (const { location, tags } of manifest.tests) {
    // a spec with no runnable test still gets an entry, so it isn't mistaken for an unlisted one
    const known = specTags.get(location.file) ?? [];
    const runnable = !tags.some((tag) => unsatisfied.has(tag));
    specTags.set(location.file, runnable ? [...new Set([...known, ...toLocalTags(tags)])] : known);
  }
  return specs.every((spec) => specTags.has(spec)) ? specTags : undefined;
};

export interface TargetCoverage {
  /** Local target tags at least one of the specs runs on, the ones covering most specs first */
  tags: string[];
  /** How many of the specs run on each tag */
  counts: Map<string, number>;
  /** How many specs those counts are out of */
  total: number;
  /** False when the manifest can't answer and every target of the config is offered instead */
  known: boolean;
}

/**
 * The targets the specs about to run actually declare. A config's own targets are the union over
 * all of its tests, so offering those would let you pick one that runs none of the given specs.
 */
export const getTargetCoverage = (config: PinnedConfig, specs: string[]): TargetCoverage => {
  const total = specs.length;

  const specTags = fromManifest(config.path, specs);
  if (!specTags) {
    return { tags: config.targets, counts: new Map(), total, known: false };
  }

  const counts = new Map<string, number>();
  for (const spec of specs) {
    for (const tag of specTags.get(spec) ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const countOf = (tag: string) => counts.get(tag) ?? 0;
  // every offered target runs at least one spec, so the run can't come back with no tests, and
  // no tag at all means the manifest knows there is nothing here to run
  const tags = [...counts.keys()].sort((a, b) => countOf(b) - countOf(a) || a.localeCompare(b));
  return { tags, counts, total, known: true };
};

/**
 * Whether the manifest was written before the latest committed change to the config, the same
 * test `update-test-config-manifests` uses to decide what to regenerate. Uncommitted edits are
 * not outdated by that definition: tags change far less often than test bodies.
 */
export const isManifestOutdated = async (configPath: string): Promise<boolean> => {
  const { manifest } = testConfig.fromPath(configPath);
  if (!manifest.exists) {
    return false;
  }
  try {
    return manifest.sha1 !== (await getGitSHA1ForPath(Path.dirname(configPath)));
  } catch {
    // outside a git checkout the manifest is all there is to go on, so it is taken as current
    return false;
  }
};
