/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnMergeSelection } from '#pipeline-utils';
import {
  BuildkiteClient,
  ON_MERGE_SELECTION_METADATA_KEY,
  ON_MERGE_TEST_TYPES,
  createDefaultOnMergeSelectionDeps,
  fullSelection,
  getRequiredEnv,
  resolveOnMergeSelection,
} from '#pipeline-utils';

const RESOLVE_TIMEOUT_MS = 2 * 60 * 1000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms).unref();
    }),
  ]);

const formatAnnotation = (selection: OnMergeSelection): string => {
  const range = selection.base
    ? `\`${selection.base.slice(0, 12)}..${selection.commit.slice(0, 12)}\` (${
        selection.commitCount
      } commit(s), from ${selection.baseSource})`
    : 'unresolved';
  const testTypes = ON_MERGE_TEST_TYPES.map((testType) => {
    const decision = selection.testTypes[testType];
    return `- ${testType}: ${decision.mode}${
      decision.mode === 'full' ? ` (${decision.reason})` : ''
    }`;
  }).join('\n');

  return `On-merge selective testing (shadow): range ${range}\n\n${testTypes}`;
};

(async () => {
  const bk = new BuildkiteClient();
  const commit = getRequiredEnv('BUILDKITE_COMMIT');

  let selection: OnMergeSelection;
  try {
    selection = await withTimeout(
      resolveOnMergeSelection(
        createDefaultOnMergeSelectionDeps({
          bk,
          pipelineSlug: getRequiredEnv('BUILDKITE_PIPELINE_SLUG'),
          branch: getRequiredEnv('BUILDKITE_BRANCH'),
          commit,
          buildNumber: parseInt(getRequiredEnv('BUILDKITE_BUILD_NUMBER'), 10),
          forceFull: process.env.ON_MERGE_FORCE_FULL === 'true',
          esSnapshotManifest:
            process.env.ES_SNAPSHOT_MANIFEST || process.env.ES_SNAPSHOT_MANIFEST_DEFAULT,
        })
      ),
      RESOLVE_TIMEOUT_MS
    );
  } catch (error) {
    console.error('Failed to resolve on-merge selection, falling back to full runs', error);
    selection = fullSelection(commit, `resolution error: ${error.message}`);
  }

  console.log(JSON.stringify(selection, null, 2));
  bk.setMetadata(ON_MERGE_SELECTION_METADATA_KEY, JSON.stringify(selection));
  bk.setAnnotation('on-merge-selective-testing', 'info', formatAnnotation(selection));
})().catch((error) => {
  // Consumers treat a missing selection as "run in full", so never fail Pre-Build.
  console.error('Failed to record on-merge selection', error);
});
