/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import * as Fs from 'fs';

import { Minimatch } from 'minimatch';

import type { BuildkiteClient } from '../../buildkite';
import type { Build } from '../../buildkite/types/build';
import { FTR_CRITICAL_PATHS, FTR_IRRELEVANT_PATHS } from './selective_ftr';

/**
 * FTR result reuse: when a PR build's Kibana dist and FTR-relevant sources are
 * identical to a previous build of the same PR, green FTR config results from
 * that build are carried over instead of rerunning.
 *
 * Every `ftr_configs.sh` job on a PR uploads a `ftr_results_*.json` artifact
 * recording per-config outcomes plus the inputs that could change them (dist
 * id, ES snapshot manifest). The orchestrator reads the previous build's
 * artifacts and drops configs whose green result provably still applies.
 * Anything unrecognized aborts reuse entirely (fail closed).
 */

export interface FtrConfigResultRecord {
  config: string;
  result: 'pass' | 'fail';
  /** Build number where this config actually ran (survives carry-forward chains). */
  sourceBuildNumber: number;
}

export interface FtrResultsArtifact {
  commit: string;
  effectiveDistId: string;
  esSnapshotManifest: string;
  records: FtrConfigResultRecord[];
}

/** Max age of a previous build to consider for reuse. */
const REUSE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Files matching these are Jest-only and cannot affect FTR results. */
const JEST_ONLY_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/__snapshots__/**',
  '**/__mocks__/**',
];

// The installed @types/minimatch exports `Minimatch` as a value only, so rely
// on inference (same workaround as affected-packages/utils.ts).
const compile = (patterns: readonly string[]) => patterns.map((p) => new Minimatch(p, { dot: true }));
const CRITICAL = compile(FTR_CRITICAL_PATHS);
const IRRELEVANT = compile(FTR_IRRELEVANT_PATHS);
const JEST_ONLY = compile(JEST_ONLY_PATTERNS);
const matchAny = (file: string, matchers: ReturnType<typeof compile>) =>
  matchers.some((m) => m.match(file));

/**
 * Any change under an FTR test root aborts reuse entirely. Finer-grained
 * invalidation (e.g. per test root) is NOT safe: FTR configs inherit across
 * roots (leaf config -> solution base -> platform base -> test-suites-src
 * base), so a platform test change can affect solution configs. Rerunning
 * everything is the only mapping-free safe answer.
 *
 * Only well-known FTR roots are recognized; a `/test/` segment elsewhere
 * (e.g. inside a plugin) is NOT a test root and falls through to the
 * fail-closed "unrecognized change" branch anyway.
 */
const FTR_TEST_ROOT_RE =
  /^(test|src\/platform\/test|x-pack\/platform\/test|x-pack\/solutions\/[^/]+\/test|x-pack\/test[^/]*)(\/|$)/;

export function isUnderFtrTestRoot(filePath: string): boolean {
  return FTR_TEST_ROOT_RE.test(filePath);
}

export type ChangedFileClassification = { kind: 'abort'; file: string } | { kind: 'ignore' };

export function classifyChangedFile(file: string): ChangedFileClassification {
  // Order matters: ftr-manifests live inside `.buildkite/**`, which is
  // otherwise irrelevant, so critical must win.
  if (matchAny(file, CRITICAL)) return { kind: 'abort', file };
  if (matchAny(file, IRRELEVANT)) return { kind: 'ignore' };
  if (isUnderFtrTestRoot(file)) return { kind: 'abort', file };
  if (matchAny(file, JEST_ONLY)) return { kind: 'ignore' };
  // Unrecognized change: we cannot prove it doesn't affect FTR.
  return { kind: 'abort', file };
}

export interface ReuseDecisionInput {
  candidateConfigs: string[];
  /** Merged per-config records from the previous build (pass wins across job retries). */
  prevRecords: Map<string, FtrConfigResultRecord>;
  /** Changed files between the previous build's commit and HEAD; null when unknown. */
  changedFiles: string[] | null;
  sameDist: boolean;
  sameEsSnapshot: boolean;
}

export interface ReuseDecision {
  reusable: Map<string, FtrConfigResultRecord>;
  abortReason: string | null;
}

export function resolveReusableConfigs(input: ReuseDecisionInput): ReuseDecision {
  const none = (abortReason: string): ReuseDecision => ({ reusable: new Map(), abortReason });

  if (!input.sameDist) return none('kibana dist differs from previous build');
  if (!input.sameEsSnapshot) return none('ES snapshot manifest differs from previous build');
  if (input.changedFiles === null) return none('unable to diff against previous build commit');

  for (const file of input.changedFiles) {
    const classification = classifyChangedFile(file);
    if (classification.kind === 'abort') {
      return none(`FTR-relevant or unrecognized change: ${classification.file}`);
    }
  }

  const reusable = new Map<string, FtrConfigResultRecord>();
  for (const config of input.candidateConfigs) {
    const record = input.prevRecords.get(config);
    if (!record || record.result !== 'pass') continue;
    reusable.set(config, record);
  }
  return { reusable, abortReason: null };
}

/** Merge records from multiple artifacts; a pass anywhere wins (job-retry semantics). */
export function mergeRecords(artifacts: FtrResultsArtifact[]): Map<string, FtrConfigResultRecord> {
  const merged = new Map<string, FtrConfigResultRecord>();
  for (const artifact of artifacts) {
    for (const record of artifact.records) {
      const existing = merged.get(record.config);
      if (!existing || (existing.result === 'fail' && record.result === 'pass')) {
        merged.set(record.config, record);
      }
    }
  }
  return merged;
}

interface ResolvedReuse {
  reusable: Map<string, FtrConfigResultRecord>;
  prevBuild: Build;
}

/**
 * Query the previous build of this PR branch and decide which FTR configs can
 * be reused. Returns null (run everything) whenever any prerequisite is
 * missing — this function must only ever reduce work, never correctness.
 */
export async function resolveFtrResultReuse(
  bk: BuildkiteClient,
  candidateConfigs: string[]
): Promise<ResolvedReuse | null> {
  if (process.env.FTR_RESULT_REUSE === 'false') {
    console.log('FTR result reuse: disabled via FTR_RESULT_REUSE=false');
    return null;
  }

  const pipelineSlug = process.env.BUILDKITE_PIPELINE_SLUG;
  const branch = process.env.BUILDKITE_BRANCH;
  const currentBuildNumber = Number(process.env.BUILDKITE_BUILD_NUMBER);
  const currentCommit = process.env.BUILDKITE_COMMIT;
  if (!pipelineSlug || !branch || !currentBuildNumber || !currentCommit) {
    console.log('FTR result reuse: missing buildkite env, skipping');
    return null;
  }

  const builds = await bk.getBuildsForBranch(pipelineSlug, branch);
  const prevBuild = builds
    .filter((b) => b.number < currentBuildNumber)
    .filter((b) => ['passed', 'failed', 'canceled'].includes(b.state))
    .sort((a, b) => b.number - a.number)[0];

  if (!prevBuild) {
    console.log('FTR result reuse: no finished previous build for this branch');
    return null;
  }
  if (Date.now() - new Date(prevBuild.created_at).getTime() > REUSE_TTL_MS) {
    console.log(`FTR result reuse: previous build #${prevBuild.number} is too old`);
    return null;
  }

  const artifacts = (await bk.getArtifacts(pipelineSlug, prevBuild.number)).filter(
    (a) => /^ftr_results.*\.json$/.test(a.filename) && a.state === 'finished'
  );
  if (!artifacts.length) {
    console.log(`FTR result reuse: previous build #${prevBuild.number} has no FTR result records`);
    return null;
  }

  const parsed: FtrResultsArtifact[] = [];
  for (const artifact of artifacts) {
    const content = await bk.getArtifactContent(artifact);
    parsed.push(JSON.parse(content) as FtrResultsArtifact);
  }

  const currentEffectiveDistId = process.env.KIBANA_BUILD_ID || process.env.BUILDKITE_BUILD_ID || '';
  const currentEsSnapshot = getCurrentEsSnapshotManifest();
  const prevDistIds = new Set(parsed.map((p) => p.effectiveDistId));
  const prevEsSnapshots = new Set(parsed.map((p) => p.esSnapshotManifest));

  // A build has one dist and one pinned ES manifest; conflicting records mean
  // something is off — fail closed.
  if (prevDistIds.size !== 1 || prevEsSnapshots.size !== 1) {
    console.log('FTR result reuse: inconsistent records in previous build, skipping');
    return null;
  }

  const sameCommit = prevBuild.commit === currentCommit;
  const sameDist =
    sameCommit || (!!currentEffectiveDistId && prevDistIds.has(currentEffectiveDistId));
  const sameEsSnapshot =
    !!currentEsSnapshot && prevEsSnapshots.has(currentEsSnapshot);

  const changedFiles = sameCommit ? [] : diffAgainst(prevBuild.commit);

  const decision = resolveReusableConfigs({
    candidateConfigs,
    prevRecords: mergeRecords(parsed),
    changedFiles,
    sameDist,
    sameEsSnapshot,
  });

  if (decision.abortReason) {
    console.log(`FTR result reuse: not reusing — ${decision.abortReason}`);
    return null;
  }

  return { reusable: decision.reusable, prevBuild };
}

/**
 * Write the carry-forward artifact so the next build can chain without
 * re-reading older builds: reused configs are recorded as passes pointing at
 * the build where they originally ran.
 */
export function writeCarriedResults(
  bk: BuildkiteClient,
  reusable: Map<string, FtrConfigResultRecord>
): void {
  const artifact: FtrResultsArtifact = {
    commit: process.env.BUILDKITE_COMMIT || '',
    effectiveDistId: process.env.KIBANA_BUILD_ID || process.env.BUILDKITE_BUILD_ID || '',
    esSnapshotManifest: getCurrentEsSnapshotManifest() || '',
    records: [...reusable.values()],
  };
  Fs.writeFileSync('ftr_results_carried.json', JSON.stringify(artifact, null, 2));
  bk.uploadArtifacts('ftr_results_carried.json');
}

function getCurrentEsSnapshotManifest(): string | null {
  if (process.env.ES_SNAPSHOT_MANIFEST) return process.env.ES_SNAPSHOT_MANIFEST;
  try {
    const value = execSync(
      'buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST_DEFAULT --default ""',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return value || null;
  } catch {
    return null;
  }
}

function diffAgainst(commit: string): string[] | null {
  try {
    const out = execSync(`git diff --name-only ${commit}...HEAD`, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out.split('\n').filter(Boolean);
  } catch {
    // Unreachable commit (e.g. force push) — cannot prove anything.
    return null;
  }
}
